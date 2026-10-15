"""Pull channels and videos from YouTube into SQLite and score them.

Outlier score = video views / median views of the channel's recent videos of
the same format (long-form vs Shorts), using only videos at least 7 days old
as the baseline so new uploads don't drag it down. The median ignores a single
viral hit that would distort an average.

Each refresh also saves a view-count snapshot for videos under 60 days old,
which gives views_per_day: how fast a video is growing right now.
"""

import logging
import re
import sqlite3
import statistics
from datetime import datetime, timedelta, timezone

import httpx

from ytiq import config
from ytiq.db import transaction
from ytiq.youtube import Ref, YouTube, YouTubeError, best_thumbnail, parse_duration, parse_ref

log = logging.getLogger(__name__)

TS = "%Y-%m-%dT%H:%M:%SZ"
BASELINE_MIN_AGE_DAYS = 7
BASELINE_SIZE = 30
SNAPSHOT_MAX_AGE_DAYS = 60
SNAPSHOT_MIN_GAP = timedelta(hours=1)
VELOCITY_WINDOW = timedelta(hours=20)


def now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def ts(dt: datetime) -> str:
    return dt.strftime(TS)


def parse_ts(s: str) -> datetime:
    return datetime.strptime(s, TS).replace(tzinfo=timezone.utc)


# --- Channels ----------------------------------------------------------------

def upsert_channel(conn: sqlite3.Connection, item: dict, tracked: bool | None = None) -> str:
    sn, st = item["snippet"], item.get("statistics", {})
    conn.execute(
        """INSERT INTO channels (id, title, handle, thumbnail_url, subscriber_count, video_count,
                                 view_count, uploads_playlist_id, tracked)
           VALUES (:id, :title, :handle, :thumb, :subs, :videos, :views, :uploads, :tracked)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title, handle = excluded.handle, thumbnail_url = excluded.thumbnail_url,
             subscriber_count = excluded.subscriber_count, video_count = excluded.video_count,
             view_count = excluded.view_count, uploads_playlist_id = excluded.uploads_playlist_id,
             tracked = CASE WHEN :set_tracked THEN excluded.tracked ELSE channels.tracked END""",
        {
            "id": item["id"],
            "title": sn["title"],
            "handle": sn.get("customUrl"),
            "thumb": best_thumbnail(sn.get("thumbnails", {})),
            "subs": int(st["subscriberCount"]) if "subscriberCount" in st else None,
            "videos": int(st.get("videoCount", 0)),
            "views": int(st.get("viewCount", 0)),
            "uploads": item.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads"),
            "tracked": 1 if tracked else 0,
            "set_tracked": tracked is not None,
        },
    )
    return item["id"]


def add_channel(conn: sqlite3.Connection, yt: YouTube, text: str) -> str:
    ref = parse_ref(text)
    if ref.kind == "video":
        video = yt.videos([ref.value])
        if not video:
            raise YouTubeError("Video not found")
        ref = Ref("channel_id", video[0]["snippet"]["channelId"])
    item = yt.channel(ref)
    if not item:
        raise YouTubeError(f"Channel not found: {text}")
    with transaction(conn):
        channel_id = upsert_channel(conn, item, tracked=True)
    refresh_channel(conn, yt, channel_id, channel_item=item)
    return channel_id


def refresh_channel(conn: sqlite3.Connection, yt: YouTube, channel_id: str, channel_item: dict | None = None) -> int:
    """Update channel stats and its latest 50 uploads. Costs 3 quota units (2 if channel_item given)."""
    item = channel_item or next(iter(yt.channels_by_ids([channel_id])), None)
    if not item:
        raise YouTubeError(f"Channel {channel_id} no longer exists")
    with transaction(conn):
        upsert_channel(conn, item)
    cache_avatar(yt.http, channel_id, best_thumbnail(item["snippet"].get("thumbnails", {})))
    uploads = item.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
    ids = yt.recent_upload_ids(uploads) if uploads else []
    items = yt.videos(ids) if ids else []
    store_videos(conn, yt, items)
    with transaction(conn):
        score_channel(conn, channel_id)
        conn.execute("UPDATE channels SET refreshed_at = ? WHERE id = ?", (ts(now()), channel_id))
    return len(items)


def refresh_due(conn: sqlite3.Connection, yt: YouTube, older_than: timedelta) -> dict:
    cutoff = ts(now() - older_than)
    rows = conn.execute(
        "SELECT id, title FROM channels WHERE tracked = 1 AND (refreshed_at IS NULL OR refreshed_at <= ?) ORDER BY refreshed_at",
        (cutoff,),
    ).fetchall()
    done, errors = 0, []
    for row in rows:
        try:
            refresh_channel(conn, yt, row["id"])
            done += 1
        except YouTubeError as e:
            log.warning("Refresh failed for %s: %s", row["title"], e)
            errors.append(f"{row['title']}: {e}")
            if "quota" in str(e).lower():
                break
    return {"refreshed": done, "errors": errors}


def avatar_path(channel_id: str):
    return config.AVATAR_DIR / f"{channel_id}.jpg"


def cache_avatar(http: httpx.Client, channel_id: str, url: str | None) -> bool:
    """Save a small copy of the channel avatar. Keeps the old copy if the download fails."""
    if not url:
        return False
    url = re.sub(r"=s\d+", "=s176", url)  # yt3 URLs encode the size; 800px is far more than we need
    try:
        resp = http.get(url, timeout=10)
    except httpx.HTTPError as e:
        log.warning("Avatar download failed for %s: %s", channel_id, e)
        return False
    if resp.status_code != 200 or not resp.headers.get("content-type", "").startswith("image/"):
        log.warning("Avatar download failed for %s: HTTP %s", channel_id, resp.status_code)
        return False
    path = avatar_path(channel_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(resp.content)
    tmp.replace(path)
    return True


# --- Videos ------------------------------------------------------------------

def store_videos(conn: sqlite3.Connection, yt: YouTube, items: list[dict]) -> None:
    t = now()
    known_shorts = {
        r["id"]: r["is_short"]
        for r in conn.execute(
            f"SELECT id, is_short FROM videos WHERE id IN ({','.join('?' * len(items))})", [i["id"] for i in items]
        )
    } if items else {}

    for item in items:
        sn, st, cd = item["snippet"], item.get("statistics", {}), item.get("contentDetails", {})
        # Skip live streams and scheduled premieres until they're done.
        if sn.get("liveBroadcastContent", "none") != "none":
            continue
        duration = parse_duration(cd.get("duration"))
        is_short = known_shorts[item["id"]] if item["id"] in known_shorts else yt.is_short(item["id"], duration)
        views = int(st["viewCount"]) if "viewCount" in st else None
        likes = int(st["likeCount"]) if "likeCount" in st else None
        comments = int(st["commentCount"]) if "commentCount" in st else None
        with transaction(conn):
            conn.execute(
                """INSERT INTO videos (id, channel_id, title, description, thumbnail_url, published_at,
                                       duration_seconds, is_short, view_count, like_count, comment_count, fetched_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET
                     title = excluded.title, description = excluded.description,
                     thumbnail_url = excluded.thumbnail_url, view_count = excluded.view_count,
                     like_count = excluded.like_count, comment_count = excluded.comment_count,
                     duration_seconds = excluded.duration_seconds, fetched_at = excluded.fetched_at""",
                (item["id"], sn["channelId"], sn["title"], sn.get("description", ""),
                 best_thumbnail(sn.get("thumbnails", {})), sn["publishedAt"][:19] + "Z",
                 duration, int(is_short), views, likes, comments, ts(t)),
            )
            published = parse_ts(sn["publishedAt"][:19] + "Z")
            if views is not None and t - published < timedelta(days=SNAPSHOT_MAX_AGE_DAYS):
                last = conn.execute(
                    "SELECT taken_at FROM video_snapshots WHERE video_id = ? ORDER BY taken_at DESC LIMIT 1", (item["id"],)
                ).fetchone()
                if not last or t - parse_ts(last["taken_at"]) >= SNAPSHOT_MIN_GAP:
                    conn.execute(
                        "INSERT INTO video_snapshots (video_id, taken_at, view_count, like_count, comment_count) VALUES (?, ?, ?, ?, ?)",
                        (item["id"], ts(t), views, likes, comments),
                    )
            conn.execute("UPDATE videos SET views_per_day = ? WHERE id = ?", (velocity(conn, item["id"], views, published, t), item["id"]))


def velocity(conn: sqlite3.Connection, video_id: str, views: int | None, published: datetime, at: datetime) -> float | None:
    """Views per day over roughly the last day. Falls back to lifetime rate for videos under 3 days old."""
    if views is None:
        return None
    prev = conn.execute(
        "SELECT taken_at, view_count FROM video_snapshots WHERE video_id = ? AND taken_at <= ? ORDER BY taken_at DESC LIMIT 1",
        (video_id, ts(at - VELOCITY_WINDOW)),
    ).fetchone()
    if prev and prev["view_count"] is not None:
        days = (at - parse_ts(prev["taken_at"])).total_seconds() / 86400
        return round((views - prev["view_count"]) / days, 1)
    age_days = (at - published).total_seconds() / 86400
    if 0 < age_days < 3:
        return round(views / max(age_days, 1 / 24), 1)
    return None


def score_channel(conn: sqlite3.Connection, channel_id: str) -> None:
    cutoff = ts(now() - timedelta(days=BASELINE_MIN_AGE_DAYS))
    for is_short in (0, 1):
        views = [
            r["view_count"]
            for r in conn.execute(
                """SELECT view_count FROM videos
                   WHERE channel_id = ? AND is_short = ? AND view_count IS NOT NULL AND published_at <= ?
                   ORDER BY published_at DESC LIMIT ?""",
                (channel_id, is_short, cutoff, BASELINE_SIZE),
            )
        ]
        median = statistics.median(views) if len(views) >= 3 else None
        if not is_short:
            conn.execute("UPDATE channels SET median_views = ? WHERE id = ?", (round(median) if median else None, channel_id))
        conn.execute(
            """UPDATE videos SET outlier_score = CASE WHEN ? > 0 THEN ROUND(CAST(view_count AS REAL) / ?, 2) END
               WHERE channel_id = ? AND is_short = ?""",
            (median, median, channel_id, is_short),
        )


def save_video(conn: sqlite3.Connection, yt: YouTube, text: str) -> str:
    """Make sure any YouTube video is in the database, for saving to a board.
    If its channel is new, it's added untracked and refreshed once so the video gets a score."""
    ref = parse_ref(text)
    if ref.kind != "video":
        raise YouTubeError("That doesn't look like a YouTube video link")
    if conn.execute("SELECT 1 FROM videos WHERE id = ?", (ref.value,)).fetchone():
        return ref.value
    items = yt.videos([ref.value])
    if not items:
        raise YouTubeError("Video not found")
    channel_id = items[0]["snippet"]["channelId"]
    known = conn.execute("SELECT 1 FROM channels WHERE id = ?", (channel_id,)).fetchone()
    if known:
        store_videos(conn, yt, items)
        with transaction(conn):
            score_channel(conn, channel_id)
    else:
        channel = yt.channels_by_ids([channel_id])
        if not channel:
            raise YouTubeError("Channel not found")
        with transaction(conn):
            upsert_channel(conn, channel[0], tracked=False)
        refresh_channel(conn, yt, channel_id, channel_item=channel[0])
        if not conn.execute("SELECT 1 FROM videos WHERE id = ?", (ref.value,)).fetchone():
            store_videos(conn, yt, items)  # older than the latest 50 uploads
            with transaction(conn):
                score_channel(conn, channel_id)
    return ref.value
