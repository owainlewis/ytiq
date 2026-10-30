import csv
import io
from datetime import timedelta

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from ytiq import app as app_module
from ytiq import db, settings
from ytiq.youtube import YouTube


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


def test_csv_export_uses_filters(client, fake):
    fake.add_channel()
    for i, views in enumerate([1000, 1000, 1000, 8000]):
        fake.add_video(f"vid{i:08d}", views, days_ago=10 + i)
    client.post("/api/channels", json={"input": "@test"})

    r = client.get("/api/videos.csv", params={"sort": "score", "min_score": 2})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(r.text)))
    assert len(rows) == 1
    assert rows[0]["outlier_score"] == "8.0"
    assert rows[0]["url"] == "https://www.youtube.com/watch?v=vid00000003"
    assert rows[0]["format"] == "long"


def test_csv_safe_neutralises_formulas():
    from ytiq.app import csv_safe

    assert csv_safe('=HYPERLINK("http://x")') == '\'=HYPERLINK("http://x")'
    assert csv_safe("-5 tips") == "'-5 tips"
    assert csv_safe("Normal title") == "Normal title"
    assert csv_safe(42) == 42


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
    monkeypatch.setenv("YOUTUBE_API_KEY", "test")
    calls = []
    monkeypatch.setattr(app_module, "run_refresh", lambda older_than: calls.append(older_than))
    app_module.app.state.refresh_on_start = True
    try:
        with TestClient(app_module.app):
            pass
    finally:
        app_module.app.state.refresh_on_start = False
    assert calls == [timedelta(hours=app_module.config.STARTUP_SKIP_HOURS)]


# --- Settings ----------------------------------------------------------------

@pytest.fixture
def no_env_keys(monkeypatch):
    for env in settings.KEYS.values():
        monkeypatch.delenv(env, raising=False)


def test_settings_save_and_mask(client, no_env_keys):
    checked = []
    app_module.app.dependency_overrides[app_module.get_key_checks] = lambda: {
        "youtube_api_key": lambda conn, key: checked.append(key)
    }
    assert client.get("/api/status").json()["api_key_configured"] is False
    r = client.put("/api/settings", json={"youtube_api_key": "  AIzaSyEXAMPLEKEY1234  "})
    assert r.status_code == 200
    yt_key = r.json()["youtube_api_key"]
    assert yt_key == {"set": True, "preview": "AIza…1234", "source": "app"}
    assert checked == ["AIzaSyEXAMPLEKEY1234"]
    assert client.get("/api/status").json()["api_key_configured"] is True
    # Keys never come back in full.
    assert "AIzaSyEXAMPLEKEY1234" not in client.get("/api/settings").text


def test_settings_bad_key_is_not_saved(client, no_env_keys):
    def reject(conn, key):
        raise HTTPException(400, "That key isn't valid.")

    app_module.app.dependency_overrides[app_module.get_key_checks] = lambda: {"youtube_api_key": reject}
    r = client.put("/api/settings", json={"youtube_api_key": "nope"})
    assert r.status_code == 400 and "isn't valid" in r.json()["detail"]
    assert client.get("/api/settings").json()["youtube_api_key"]["set"] is False


def test_settings_empty_string_clears(client, no_env_keys):
    app_module.app.dependency_overrides[app_module.get_key_checks] = lambda: {}
    client.put("/api/settings", json={"supadata_api_key": "sd_123456789012", "anthropic_api_key": "sk-ant-123456789"})
    assert client.get("/api/status").json()["analyze_configured"] is True
    client.put("/api/settings", json={"supadata_api_key": ""})
    assert client.get("/api/settings").json()["supadata_api_key"]["set"] is False
    assert client.get("/api/status").json()["analyze_configured"] is False


def test_saved_key_wins_over_env(conn, monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "from-env")
    assert settings.get(conn, "youtube_api_key") == "from-env"
    assert settings.source(conn, "youtube_api_key") == "env"
    settings.put(conn, "youtube_api_key", "from-app")
    assert settings.get(conn, "youtube_api_key") == "from-app"


@pytest.mark.parametrize(
    "message, expected",
    [
        ("API key not valid. Please pass a valid API key.", "isn't valid"),
        ("YouTube Data API v3 has not been used in project 123 before or it is disabled.", "Enable it"),
    ],
)
def test_youtube_key_check_explains_errors(conn, message, expected):
    http = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(400, json={"error": {"message": message}})))
    with pytest.raises(HTTPException) as e:
        app_module.check_youtube_key(conn, "bad", http=http)
    assert expected in e.value.detail


def test_youtube_key_check_passes(conn, fake):
    fake.add_channel(handle="@YouTube")
    app_module.check_youtube_key(conn, "good", http=httpx.Client(transport=httpx.MockTransport(fake.handler)))
