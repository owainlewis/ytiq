import json
import logging
import sqlite3
import threading
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from ytiq import config, db, sync
from ytiq.youtube import QuotaExceeded, YouTube, YouTubeError

log = logging.getLogger("ytiq")

# --- Background refresh ------------------------------------------------------

_refresh_lock = threading.Lock()
refresh_state: dict = {"running": False, "last_run": None, "last_result": None}


def run_refresh(older_than: timedelta = timedelta(0)) -> bool:
    """Refresh tracked channels not refreshed within `older_than`, in a background thread.
    Returns False if a refresh is already running."""
    if not _refresh_lock.acquire(blocking=False):
        return False

    def work():
        refresh_state["running"] = True
        conn = db.connect()
        try:
            refresh_state["last_result"] = sync.refresh_due(conn, YouTube(conn), older_than)
        except Exception as e:
            log.exception("Refresh failed")
            refresh_state["last_result"] = {"refreshed": 0, "errors": [str(e)]}
        finally:
            refresh_state["last_run"] = sync.ts(sync.now())
            refresh_state["running"] = False
            conn.close()
            _refresh_lock.release()

    threading.Thread(target=work, daemon=True).start()
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = db.connect()
    db.init(conn)
    conn.close()
    # Refresh once on startup. No timer: further refreshes are manual, to save quota.
    # Channels refreshed recently are skipped so restarts (e.g. --reload) cost nothing.
    if app.state.refresh_on_start and config.YOUTUBE_API_KEY:
        run_refresh(older_than=timedelta(hours=config.STARTUP_SKIP_HOURS))
    yield


app = FastAPI(title="ytiq", lifespan=lifespan)
app.state.refresh_on_start = True


def get_conn():
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


def get_yt(conn: sqlite3.Connection = Depends(get_conn)) -> YouTube:
    return YouTube(conn)


def youtube_errors(fn):
    try:
        return fn()
    except QuotaExceeded as e:
        raise HTTPException(429, str(e))
    except YouTubeError as e:
        raise HTTPException(400, str(e))


# --- Status ------------------------------------------------------------------

@app.get("/api/status")
def status(conn: sqlite3.Connection = Depends(get_conn), yt: YouTube = Depends(get_yt)):
    counts = conn.execute(
        """SELECT (SELECT COUNT(*) FROM channels WHERE tracked = 1) AS channels,
                  (SELECT COUNT(*) FROM videos) AS videos,
                  (SELECT MAX(refreshed_at) FROM channels WHERE tracked = 1) AS last_refreshed"""
    ).fetchone()
    return {
        "api_key_configured": bool(config.YOUTUBE_API_KEY),
        "quota_used": yt.quota_used(),
        "quota_limit": config.DAILY_QUOTA_LIMIT,
        **dict(counts),
        **refresh_state,
    }


@app.post("/api/refresh")
def refresh_all():
    started = run_refresh()
    return {"started": started, **refresh_state}


# --- Channels ----------------------------------------------------------------

class ChannelIn(BaseModel):
    input: str


CHANNEL_SELECT = """
SELECT c.*,
  (SELECT COUNT(*) FROM videos v WHERE v.channel_id = c.id AND v.is_short = 0
     AND v.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-30 days')) AS videos_30d,
  (SELECT MAX(published_at) FROM videos v WHERE v.channel_id = c.id) AS last_upload,
  (SELECT MAX(outlier_score) FROM videos v WHERE v.channel_id = c.id AND v.is_short = 0
     AND v.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-90 days')) AS top_score_90d
FROM channels c
"""


@app.get("/api/channels")
def list_channels(conn: sqlite3.Connection = Depends(get_conn)):
    rows = conn.execute(CHANNEL_SELECT + " WHERE c.tracked = 1 ORDER BY c.title COLLATE NOCASE").fetchall()
    return [dict(r) for r in rows]


@app.get("/api/channels/{channel_id}")
def get_channel(channel_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    row = conn.execute(CHANNEL_SELECT + " WHERE c.id = ?", (channel_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Channel not found")
    return dict(row)


_avatar_http = httpx.Client(timeout=10)


@app.get("/api/channels/{channel_id}/avatar", include_in_schema=False)
def channel_avatar(channel_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    path = sync.avatar_path(channel_id)
    if not path.is_file():
        row = conn.execute("SELECT thumbnail_url FROM channels WHERE id = ?", (channel_id,)).fetchone()
        if not row or not sync.cache_avatar(_avatar_http, channel_id, row["thumbnail_url"]):
            raise HTTPException(404, "No avatar")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=3600"})


@app.post("/api/channels", status_code=201)
def add_channel(body: ChannelIn, conn: sqlite3.Connection = Depends(get_conn), yt: YouTube = Depends(get_yt)):
    channel_id = youtube_errors(lambda: sync.add_channel(conn, yt, body.input))
    return dict(conn.execute("SELECT * FROM channels WHERE id = ?", (channel_id,)).fetchone())


@app.post("/api/channels/{channel_id}/refresh")
def refresh_channel(channel_id: str, conn: sqlite3.Connection = Depends(get_conn), yt: YouTube = Depends(get_yt)):
    count = youtube_errors(lambda: sync.refresh_channel(conn, yt, channel_id))
    return {"videos": count}


@app.delete("/api/channels/{channel_id}", status_code=204)
def untrack_channel(channel_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    # Keep the rows so saved board items survive; just stop tracking.
    with db.transaction(conn):
        conn.execute("UPDATE channels SET tracked = 0 WHERE id = ?", (channel_id,))


# --- Videos ------------------------------------------------------------------

VIDEO_SELECT = """
SELECT v.id, v.channel_id, v.title, v.thumbnail_url, v.published_at, v.duration_seconds, v.is_short,
       v.view_count, v.like_count, v.comment_count, v.outlier_score, v.views_per_day,
       c.title AS channel_title, c.thumbnail_url AS channel_thumbnail, c.handle AS channel_handle,
       c.median_views AS channel_median_views, c.subscriber_count AS channel_subscribers,
       (SELECT json_group_array(board_id) FROM board_items b WHERE b.video_id = v.id) AS board_ids
FROM videos v JOIN channels c ON c.id = v.channel_id
"""

SORTS = {
    "newest": "v.published_at DESC",
    "score": "v.outlier_score DESC NULLS LAST, v.view_count DESC",
    "views": "v.view_count DESC NULLS LAST",
    # Velocity relative to channel size, so small channels' breakouts surface too.
    "rising": "CAST(v.views_per_day AS REAL) / MAX(c.median_views, 1) DESC NULLS LAST",
}


def video_rows(conn, where: list[str], params: list, sort: str, limit: int, offset: int) -> list[dict]:
    sql = VIDEO_SELECT + (" WHERE " + " AND ".join(where) if where else "")
    sql += f" ORDER BY {SORTS.get(sort, SORTS['newest'])} LIMIT ? OFFSET ?"
    rows = []
    for r in conn.execute(sql, [*params, limit, offset]):
        d = dict(r)
        d["board_ids"] = json.loads(d["board_ids"] or "[]")
        d["is_short"] = bool(d["is_short"])
        rows.append(d)
    return rows


@app.get("/api/videos")
def list_videos(
    sort: str = "newest",
    days: int | None = None,
    channel_id: str | None = None,
    shorts: bool = False,
    min_score: float | None = None,
    q: str | None = None,
    limit: int = 60,
    offset: int = 0,
    conn: sqlite3.Connection = Depends(get_conn),
):
    where, params = [] if channel_id else ["c.tracked = 1"], []
    if not shorts:
        where.append("v.is_short = 0")
    if days:
        where.append("v.published_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)")
        params.append(f"-{days} days")
    if channel_id:
        where.append("v.channel_id = ?")
        params.append(channel_id)
    if min_score is not None:
        where.append("v.outlier_score >= ?")
        params.append(min_score)
    if q:
        where.append("v.title LIKE ?")
        params.append(f"%{q}%")
    return video_rows(conn, where, params, sort, min(limit, 200), offset)


@app.get("/api/videos/{video_id}")
def get_video(video_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    rows = video_rows(conn, ["v.id = ?"], [video_id], "newest", 1, 0)
    if not rows:
        raise HTTPException(404, "Video not found")
    video = rows[0]
    video["description"] = conn.execute("SELECT description FROM videos WHERE id = ?", (video_id,)).fetchone()[0]
    video["snapshots"] = [
        dict(r)
        for r in conn.execute(
            "SELECT taken_at, view_count FROM video_snapshots WHERE video_id = ? ORDER BY taken_at", (video_id,)
        )
    ]
    video["boards"] = [
        dict(r)
        for r in conn.execute(
            "SELECT b.id, b.name, i.note FROM board_items i JOIN boards b ON b.id = i.board_id WHERE i.video_id = ?",
            (video_id,),
        )
    ]
    return video


# --- Boards ------------------------------------------------------------------

class BoardIn(BaseModel):
    name: str
    description: str = ""


class BoardPatch(BaseModel):
    name: str | None = None
    description: str | None = None


class ItemIn(BaseModel):
    video: str  # video id or any YouTube URL
    note: str = ""


class ItemPatch(BaseModel):
    note: str


@app.get("/api/boards")
def list_boards(conn: sqlite3.Connection = Depends(get_conn)):
    rows = conn.execute(
        """SELECT b.*, COUNT(i.video_id) AS item_count,
             (SELECT json_group_array(thumbnail_url) FROM (
                SELECT v.thumbnail_url FROM board_items i2 JOIN videos v ON v.id = i2.video_id
                WHERE i2.board_id = b.id ORDER BY i2.added_at DESC LIMIT 4)) AS covers
           FROM boards b LEFT JOIN board_items i ON i.board_id = b.id
           GROUP BY b.id ORDER BY b.name COLLATE NOCASE"""
    ).fetchall()
    return [{**dict(r), "covers": json.loads(r["covers"] or "[]")} for r in rows]


@app.post("/api/boards", status_code=201)
def create_board(body: BoardIn, conn: sqlite3.Connection = Depends(get_conn)):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Board name is required")
    try:
        with db.transaction(conn):
            cur = conn.execute("INSERT INTO boards (name, description) VALUES (?, ?)", (name, body.description))
    except sqlite3.IntegrityError:
        raise HTTPException(409, f"A board called '{name}' already exists")
    return dict(conn.execute("SELECT * FROM boards WHERE id = ?", (cur.lastrowid,)).fetchone())


def _board(conn, board_id: int) -> dict:
    row = conn.execute("SELECT * FROM boards WHERE id = ?", (board_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Board not found")
    return dict(row)


@app.get("/api/boards/{board_id}")
def get_board(board_id: int, conn: sqlite3.Connection = Depends(get_conn)):
    board = _board(conn, board_id)
    rows = conn.execute(
        VIDEO_SELECT.replace("FROM videos v", ", i.note, i.added_at FROM videos v JOIN board_items i ON i.video_id = v.id")
        + " WHERE i.board_id = ? ORDER BY i.added_at DESC",
        (board_id,),
    ).fetchall()
    board["items"] = [{**dict(r), "board_ids": json.loads(r["board_ids"] or "[]"), "is_short": bool(r["is_short"])} for r in rows]
    return board


@app.patch("/api/boards/{board_id}")
def update_board(board_id: int, body: BoardPatch, conn: sqlite3.Connection = Depends(get_conn)):
    _board(conn, board_id)
    try:
        with db.transaction(conn):
            if body.name is not None and body.name.strip():
                conn.execute("UPDATE boards SET name = ? WHERE id = ?", (body.name.strip(), board_id))
            if body.description is not None:
                conn.execute("UPDATE boards SET description = ? WHERE id = ?", (body.description, board_id))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A board with that name already exists")
    return _board(conn, board_id)


@app.delete("/api/boards/{board_id}", status_code=204)
def delete_board(board_id: int, conn: sqlite3.Connection = Depends(get_conn)):
    with db.transaction(conn):
        conn.execute("DELETE FROM boards WHERE id = ?", (board_id,))


@app.post("/api/boards/{board_id}/items", status_code=201)
def add_item(board_id: int, body: ItemIn, conn: sqlite3.Connection = Depends(get_conn), yt: YouTube = Depends(get_yt)):
    _board(conn, board_id)
    video_id = youtube_errors(lambda: sync.save_video(conn, yt, body.video))
    with db.transaction(conn):
        conn.execute(
            "INSERT INTO board_items (board_id, video_id, note, added_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(board_id, video_id) DO NOTHING",
            (board_id, video_id, body.note, sync.ts(sync.now())),
        )
    return {"board_id": board_id, "video_id": video_id}


@app.patch("/api/boards/{board_id}/items/{video_id}")
def update_item(board_id: int, video_id: str, body: ItemPatch, conn: sqlite3.Connection = Depends(get_conn)):
    with db.transaction(conn):
        cur = conn.execute("UPDATE board_items SET note = ? WHERE board_id = ? AND video_id = ?", (body.note, board_id, video_id))
    if cur.rowcount == 0:
        raise HTTPException(404, "Item not found")
    return {"ok": True}


@app.delete("/api/boards/{board_id}/items/{video_id}", status_code=204)
def remove_item(board_id: int, video_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    with db.transaction(conn):
        conn.execute("DELETE FROM board_items WHERE board_id = ? AND video_id = ?", (board_id, video_id))


STATIC = Path(__file__).parent / "static"


@app.get("/{path:path}", include_in_schema=False)
def spa(path: str):
    if path.startswith("api/"):
        raise HTTPException(404, "Not found")
    file = (STATIC / path).resolve()
    if path and file.is_file() and file.is_relative_to(STATIC.resolve()):
        return FileResponse(file)
    index = STATIC / "index.html"
    if not index.is_file():
        return PlainTextResponse("UI not built. Run: cd web && pnpm install && pnpm build", status_code=503)
    return FileResponse(index)
