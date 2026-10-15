import sqlite3
from contextlib import contextmanager
from pathlib import Path

from ytiq import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS channels (
    id                  TEXT PRIMARY KEY,          -- UC...
    title               TEXT NOT NULL,
    handle              TEXT,
    thumbnail_url       TEXT,
    subscriber_count    INTEGER,
    video_count         INTEGER,
    view_count          INTEGER,
    uploads_playlist_id TEXT,
    median_views        INTEGER,                   -- baseline for outlier scores
    tracked             INTEGER NOT NULL DEFAULT 1,-- 0 = only known because a video was saved
    added_at            TEXT NOT NULL DEFAULT (datetime('now')),
    refreshed_at        TEXT
);

CREATE TABLE IF NOT EXISTS videos (
    id               TEXT PRIMARY KEY,
    channel_id       TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    thumbnail_url    TEXT,
    published_at     TEXT NOT NULL,
    duration_seconds INTEGER,
    is_short         INTEGER NOT NULL DEFAULT 0,
    view_count       INTEGER,
    like_count       INTEGER,
    comment_count    INTEGER,
    outlier_score    REAL,                         -- views / channel median
    views_per_day    REAL,                         -- recent velocity from snapshots
    fetched_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_videos_channel_published ON videos(channel_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_score ON videos(outlier_score DESC);

CREATE TABLE IF NOT EXISTS video_snapshots (
    video_id      TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    taken_at      TEXT NOT NULL,
    view_count    INTEGER,
    like_count    INTEGER,
    comment_count INTEGER,
    PRIMARY KEY (video_id, taken_at)
);

CREATE TABLE IF NOT EXISTS boards (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS board_items (
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    note     TEXT NOT NULL DEFAULT '',
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (board_id, video_id)
);

CREATE TABLE IF NOT EXISTS quota_usage (
    day   TEXT PRIMARY KEY,                        -- Pacific date, matches YouTube's reset
    units INTEGER NOT NULL DEFAULT 0
);
"""


def connect(path: Path | None = None) -> sqlite3.Connection:
    path = Path(path or config.DB_PATH)
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


@contextmanager
def transaction(conn: sqlite3.Connection):
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
