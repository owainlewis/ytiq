from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from ytiq import app as app_module
from ytiq import db
from ytiq.youtube import YouTube


@pytest.fixture
def client(tmp_path, monkeypatch, yt, fake):
    path = tmp_path / "test.db"
    monkeypatch.setattr(db.config, "DB_PATH", path)
    app_module.app.state.refresh_on_start = False
    # Route the API's YouTube client through the fake, against the test database.
    app_module.app.dependency_overrides[app_module.get_yt] = lambda: YouTube(db.connect(path), api_key="test", http=yt.http)
    with TestClient(app_module.app) as c:
        yield c
    app_module.app.dependency_overrides.clear()


def test_channel_feed_and_outliers(client, fake):
    fake.add_channel()
    for i, views in enumerate([1000, 1000, 1000, 8000]):
        fake.add_video(f"vid{i:08d}", views, days_ago=10 + i)

    r = client.post("/api/channels", json={"input": "https://www.youtube.com/@test"})
    assert r.status_code == 201, r.text
    assert r.json()["median_views"] == 1000

    feed = client.get("/api/videos").json()
    assert [v["id"] for v in feed][0] == "vid00000000"  # newest first

    outliers = client.get("/api/videos", params={"sort": "score", "min_score": 2}).json()
    assert [v["id"] for v in outliers] == ["vid00000003"]
    assert outliers[0]["outlier_score"] == 8.0

    channels = client.get("/api/channels").json()
    assert channels[0]["top_score_90d"] == 8.0

    assert client.delete(f"/api/channels/{channels[0]['id']}").status_code == 204
    assert client.get("/api/videos").json() == []


def test_avatar_served_from_cache(client, fake):
    fake.add_channel()
    channel = client.post("/api/channels", json={"input": "@test"}).json()
    r = client.get(f"/api/channels/{channel['id']}/avatar")
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert client.get("/api/channels/UCnope/avatar").status_code == 404


def test_unknown_channel_is_400(client, fake):
    r = client.post("/api/channels", json={"input": "@nobody"})
    assert r.status_code == 400
    assert "not found" in r.json()["detail"]


def test_boards(client, fake):
    fake.add_channel()
    for i in range(3):
        fake.add_video(f"vid{i:08d}", 1000, days_ago=10 + i)
    fake.add_video("great000001", 9000, days_ago=20)

    board = client.post("/api/boards", json={"name": "Hooks"}).json()
    assert client.post("/api/boards", json={"name": "Hooks"}).status_code == 409

    r = client.post(f"/api/boards/{board['id']}/items", json={"video": "https://youtu.be/great000001", "note": "cold open"})
    assert r.status_code == 201, r.text

    detail = client.get(f"/api/boards/{board['id']}").json()
    assert detail["items"][0]["id"] == "great000001"
    assert detail["items"][0]["note"] == "cold open"
    assert detail["items"][0]["board_ids"] == [board["id"]]

    client.patch(f"/api/boards/{board['id']}/items/great000001", json={"note": "new note"})
    assert client.get("/api/videos/great000001").json()["boards"][0]["note"] == "new note"

    boards = client.get("/api/boards").json()
    assert boards[0]["item_count"] == 1 and boards[0]["covers"]

    # Saved channel was not tracked, so it stays out of the feed.
    assert client.get("/api/videos").json() == []

    client.delete(f"/api/boards/{board['id']}/items/great000001")
    assert client.get(f"/api/boards/{board['id']}").json()["items"] == []


def test_static_ui_served(client):
    r = client.get("/")
    assert r.status_code == 200 and "<html" in r.text.lower()


def test_startup_refreshes_only_stale_channels(tmp_path, monkeypatch):
    monkeypatch.setattr(db.config, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(app_module.config, "YOUTUBE_API_KEY", "test")
    calls = []
    monkeypatch.setattr(app_module, "run_refresh", lambda older_than: calls.append(older_than))
    app_module.app.state.refresh_on_start = True
    try:
        with TestClient(app_module.app):
            pass
    finally:
        app_module.app.state.refresh_on_start = False
    assert calls == [timedelta(hours=app_module.config.STARTUP_SKIP_HOURS)]
