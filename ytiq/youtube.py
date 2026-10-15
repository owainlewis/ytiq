"""Thin YouTube Data API v3 client. Costs are in quota units.

Fetching a channel's recent videos costs 2 units (uploads playlist + video
stats), not the 100 units a search.list call would cost.
"""

import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

from ytiq import config

API = "https://www.googleapis.com/youtube/v3"


class YouTubeError(Exception):
    pass


class QuotaExceeded(YouTubeError):
    pass


# --- Input parsing -----------------------------------------------------------

@dataclass
class Ref:
    kind: str  # video | channel_id | handle | username | search
    value: str


_PATTERNS = [
    ("video", re.compile(r"youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|live/|embed/)([\w-]{11})")),
    ("video", re.compile(r"youtu\.be/([\w-]{11})")),
    ("channel_id", re.compile(r"youtube\.com/channel/(UC[\w-]{22})")),
    ("handle", re.compile(r"youtube\.com/@([\w.\-]+)")),
    ("username", re.compile(r"youtube\.com/user/([\w.\-]+)")),
    ("search", re.compile(r"youtube\.com/c/([\w.\-]+)")),
]


def parse_ref(text: str) -> Ref:
    text = text.strip()
    for kind, pattern in _PATTERNS:
        if m := pattern.search(text):
            return Ref(kind, m.group(1))
    if text.startswith("@"):
        return Ref("handle", text[1:])
    if re.fullmatch(r"UC[\w-]{22}", text):
        return Ref("channel_id", text)
    if re.fullmatch(r"[\w-]{11}", text) and not text.isalpha():
        return Ref("video", text)
    return Ref("search", text)


def parse_duration(iso: str | None) -> int:
    """ISO 8601 duration (PT1H2M3S, P1DT2H) to seconds."""
    if not iso:
        return 0
    m = re.fullmatch(r"P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?", iso)
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + s


def best_thumbnail(thumbnails: dict) -> str | None:
    for size in ("maxres", "standard", "high", "medium", "default"):
        if size in thumbnails:
            return thumbnails[size]["url"]
    return None


# --- Client ------------------------------------------------------------------

class YouTube:
    def __init__(self, conn: sqlite3.Connection, api_key: str | None = None, http: httpx.Client | None = None):
        self.conn = conn
        self.api_key = api_key if api_key is not None else config.YOUTUBE_API_KEY
        self.http = http or httpx.Client(timeout=20)

    # Quota resets at midnight Pacific time.
    @staticmethod
    def quota_day() -> str:
        return datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()

    def quota_used(self) -> int:
        row = self.conn.execute("SELECT units FROM quota_usage WHERE day = ?", (self.quota_day(),)).fetchone()
        return row["units"] if row else 0

    def _spend(self, units: int) -> None:
        day = self.quota_day()
        # Atomic check-and-increment so concurrent refreshes cannot overshoot.
        cur = self.conn.execute(
            """INSERT INTO quota_usage (day, units) VALUES (?, ?)
               ON CONFLICT(day) DO UPDATE SET units = units + excluded.units
               WHERE units + excluded.units <= ?""",
            (day, units, config.DAILY_QUOTA_LIMIT),
        )
        self.conn.commit()
        if cur.rowcount == 0:
            raise QuotaExceeded(f"Daily YouTube quota limit ({config.DAILY_QUOTA_LIMIT}) reached")

    def _get(self, endpoint: str, params: dict, cost: int = 1) -> dict:
        if not self.api_key:
            raise YouTubeError("YOUTUBE_API_KEY is not set. Add it to .env and restart.")
        self._spend(cost)
        resp = self.http.get(f"{API}/{endpoint}", params={**params, "key": self.api_key})
        if resp.status_code != 200:
            try:
                msg = resp.json()["error"]["message"]
            except Exception:
                msg = resp.text[:200]
            if resp.status_code == 403 and "quota" in msg.lower():
                raise QuotaExceeded(msg)
            raise YouTubeError(f"YouTube API {resp.status_code}: {msg}")
        return resp.json()

    def channel(self, ref: Ref) -> dict | None:
        parts = "snippet,statistics,contentDetails"
        if ref.kind == "channel_id":
            params = {"id": ref.value}
        elif ref.kind == "handle":
            params = {"forHandle": ref.value}
        elif ref.kind == "username":
            params = {"forUsername": ref.value}
        elif ref.kind == "search":
            found = self._get("search", {"part": "snippet", "q": ref.value, "type": "channel", "maxResults": 1}, cost=100)
            if not found.get("items"):
                return None
            params = {"id": found["items"][0]["snippet"]["channelId"]}
        else:
            raise YouTubeError(f"Not a channel reference: {ref.value}")
        items = self._get("channels", {"part": parts, **params}).get("items", [])
        return items[0] if items else None

    def channels_by_ids(self, ids: list[str]) -> list[dict]:
        out = []
        for i in range(0, len(ids), 50):
            batch = ids[i : i + 50]
            out += self._get("channels", {"part": "snippet,statistics,contentDetails", "id": ",".join(batch)}).get("items", [])
        return out

    def recent_upload_ids(self, uploads_playlist_id: str, limit: int = 50) -> list[str]:
        data = self._get("playlistItems", {"part": "contentDetails", "playlistId": uploads_playlist_id, "maxResults": min(limit, 50)})
        return [item["contentDetails"]["videoId"] for item in data.get("items", [])]

    def videos(self, ids: list[str]) -> list[dict]:
        out = []
        for i in range(0, len(ids), 50):
            batch = ids[i : i + 50]
            out += self._get("videos", {"part": "snippet,statistics,contentDetails", "id": ",".join(batch)}).get("items", [])
        return out

    def is_short(self, video_id: str, duration_seconds: int) -> bool:
        """Shorts are up to 3 minutes. For short durations, ask YouTube directly:
        /shorts/<id> returns 200 for a Short and redirects to /watch otherwise."""
        if duration_seconds == 0 or duration_seconds > 180:
            return False
        try:
            resp = self.http.head(
                f"https://www.youtube.com/shorts/{video_id}",
                follow_redirects=False,
                headers={"Cookie": "SOCS=CAI"},  # skip the EU consent redirect
            )
            if resp.status_code == 200:
                return True
            if resp.status_code in (301, 302, 303, 307, 308) and "/watch" in resp.headers.get("location", ""):
                return False
        except httpx.HTTPError:
            pass
        return duration_seconds <= 60
