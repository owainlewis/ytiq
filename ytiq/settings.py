"""API keys, saved from the in-app setup screen.

A key saved in the app wins over the same key in .env, so members never
need to edit a file. .env still works for anyone who prefers it.
"""

import os
import sqlite3

# Setting name -> environment variable it falls back to.
KEYS = {
    "youtube_api_key": "YOUTUBE_API_KEY",
    "supadata_api_key": "SUPADATA_API_KEY",
    "anthropic_api_key": "ANTHROPIC_API_KEY",
}


def get(conn: sqlite3.Connection, name: str) -> str:
    row = conn.execute("SELECT value FROM settings WHERE name = ?", (name,)).fetchone()
    if row and row["value"]:
        return row["value"]
    return os.environ.get(KEYS[name], "")


def source(conn: sqlite3.Connection, name: str) -> str | None:
    """Where a key comes from: 'app', 'env', or None if it isn't set."""
    row = conn.execute("SELECT value FROM settings WHERE name = ?", (name,)).fetchone()
    if row and row["value"]:
        return "app"
    return "env" if os.environ.get(KEYS[name]) else None


def put(conn: sqlite3.Connection, name: str, value: str) -> None:
    if name not in KEYS:
        raise KeyError(name)
    conn.execute(
        "INSERT INTO settings (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value",
        (name, value.strip()),
    )
    conn.commit()


def mask(value: str) -> str:
    return value[:4] + "…" + value[-4:] if len(value) > 12 else "…"
