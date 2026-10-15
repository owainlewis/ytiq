from datetime import timedelta

import httpx
import pytest

from ytiq import config, db, sync
from ytiq.youtube import YouTube

CHANNEL_ID = "UC" + "a" * 22


def iso(days_ago: float) -> str:
    return sync.ts(sync.now() - timedelta(days=days_ago))


class FakeYouTube:
    """Serves canned Data API responses and records quota-costing calls."""

    def __init__(self):
        self.channels: dict[str, dict] = {}
        self.videos: dict[str, dict] = {}
        self.uploads: dict[str, list[str]] = {}
        self.shorts: set[str] = set()
        self.calls: list[str] = []
        self.missing_images: set[str] = set()

    def add_channel(self, channel_id=CHANNEL_ID, title="Test Channel", handle="@test"):
        self.channels[channel_id] = {
            "id": channel_id,
            "snippet": {"title": title, "customUrl": handle, "thumbnails": {"default": {"url": "http://img/c"}}},
            "statistics": {"subscriberCount": "1000", "videoCount": "10", "viewCount": "50000"},
            "contentDetails": {"relatedPlaylists": {"uploads": "UU" + channel_id[2:]}},
        }
        self.uploads["UU" + channel_id[2:]] = []

    def add_video(self, video_id, views, days_ago, channel_id=CHANNEL_ID, duration="PT10M", short=False, live="none"):
        self.videos[video_id] = {
            "id": video_id,
            "snippet": {
                "channelId": channel_id,
                "title": f"Video {video_id}",
                "description": "",
                "publishedAt": iso(days_ago),
                "thumbnails": {"high": {"url": f"http://img/{video_id}"}},
                "liveBroadcastContent": live,
            },
            "statistics": {"viewCount": str(views), "likeCount": "10", "commentCount": "1"},
            "contentDetails": {"duration": duration},
        }
        self.uploads["UU" + channel_id[2:]].insert(0, video_id)
        if short:
            self.shorts.add(video_id)

    def handler(self, request: httpx.Request) -> httpx.Response:
        if request.url.host == "img":
            if request.url.path in self.missing_images:
                return httpx.Response(429)
            return httpx.Response(200, content=b"\xff\xd8jpeg", headers={"content-type": "image/jpeg"})
        p = request.url.params
        path = request.url.path
        if request.method == "HEAD" and "/shorts/" in path:
            vid = path.rsplit("/", 1)[1]
            if vid in self.shorts:
                return httpx.Response(200)
            return httpx.Response(303, headers={"location": f"https://www.youtube.com/watch?v={vid}"})
        endpoint = path.rsplit("/", 1)[1]
        self.calls.append(endpoint)
        if endpoint == "channels":
            if "forHandle" in p:
                items = [c for c in self.channels.values() if c["snippet"]["customUrl"].lstrip("@") == p["forHandle"].lstrip("@")]
            else:
                items = [self.channels[i] for i in p["id"].split(",") if i in self.channels]
            return httpx.Response(200, json={"items": items})
        if endpoint == "playlistItems":
            ids = self.uploads.get(p["playlistId"], [])[: int(p["maxResults"])]
            return httpx.Response(200, json={"items": [{"contentDetails": {"videoId": i}} for i in ids]})
        if endpoint == "videos":
            return httpx.Response(200, json={"items": [self.videos[i] for i in p["id"].split(",") if i in self.videos]})
        if endpoint == "search":
            first = next(iter(self.channels.values()), None)
            return httpx.Response(200, json={"items": [{"snippet": {"channelId": first["id"]}}] if first else []})
        return httpx.Response(404, json={"error": {"message": "unknown endpoint"}})


@pytest.fixture(autouse=True)
def avatar_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "AVATAR_DIR", tmp_path / "avatars")
    return tmp_path / "avatars"


@pytest.fixture
def conn():
    c = db.connect(":memory:")
    db.init(c)
    yield c
    c.close()


@pytest.fixture
def fake():
    return FakeYouTube()


@pytest.fixture
def yt(conn, fake):
    return YouTube(conn, api_key="test", http=httpx.Client(transport=httpx.MockTransport(fake.handler)))
