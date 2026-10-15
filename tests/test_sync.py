from datetime import timedelta

from ytiq import sync
from tests.conftest import CHANNEL_ID


def video(conn, vid):
    return conn.execute("SELECT * FROM videos WHERE id = ?", (vid,)).fetchone()


def test_add_channel_pulls_videos_and_scores_against_median(conn, yt, fake):
    fake.add_channel()
    # Mature baseline: 1k, 2k, 3k, 4k, and one viral 100k. Median = 3k (the mean would be 22k).
    for i, views in enumerate([1000, 2000, 3000, 4000, 100000]):
        fake.add_video(f"old{i:08d}", views, days_ago=30 + i)
    fake.add_video("new00000001", 9000, days_ago=2)

    sync.add_channel(conn, yt, "@test")

    ch = conn.execute("SELECT * FROM channels").fetchone()
    assert ch["tracked"] == 1 and ch["median_views"] == 3000
    assert video(conn, "old00000004")["outlier_score"] == 33.33
    assert video(conn, "new00000001")["outlier_score"] == 3.0
    # 3 units: channels + playlistItems + videos. No 100-unit search.
    assert yt.quota_used() == 3


def test_shorts_and_live_are_handled(conn, yt, fake):
    fake.add_channel()
    for i in range(4):
        fake.add_video(f"lng{i:08d}", 1000, days_ago=20 + i)
    fake.add_video("sht00000001", 50000, days_ago=20, duration="PT40S", short=True)
    fake.add_video("liv00000001", 10, days_ago=0, live="upcoming")
    fake.add_video("twomin00001", 1000, days_ago=21, duration="PT2M30S")  # under 3 min but not a Short

    sync.add_channel(conn, yt, CHANNEL_ID)

    assert video(conn, "sht00000001")["is_short"] == 1
    assert video(conn, "twomin00001")["is_short"] == 0
    assert video(conn, "liv00000001") is None
    # A viral Short does not inflate the long-form baseline.
    assert conn.execute("SELECT median_views FROM channels").fetchone()[0] == 1000


def test_velocity_from_snapshots(conn, yt, fake, monkeypatch):
    fake.add_channel()
    fake.add_video("vid00000001", 1000, days_ago=10)
    start = sync.now()
    monkeypatch.setattr(sync, "now", lambda: start)
    sync.add_channel(conn, yt, "@test")
    assert video(conn, "vid00000001")["views_per_day"] is None  # one snapshot, too old for lifetime fallback

    fake.videos["vid00000001"]["statistics"]["viewCount"] = "3000"
    monkeypatch.setattr(sync, "now", lambda: start + timedelta(days=1))
    sync.refresh_channel(conn, yt, CHANNEL_ID)
    assert video(conn, "vid00000001")["views_per_day"] == 2000.0
    assert conn.execute("SELECT COUNT(*) FROM video_snapshots").fetchone()[0] == 2


def test_refresh_due_skips_fresh_channels(conn, yt, fake):
    fake.add_channel()
    fake.add_video("vid00000001", 1000, days_ago=10)
    sync.add_channel(conn, yt, "@test")
    used = yt.quota_used()
    assert sync.refresh_due(conn, yt, timedelta(hours=6))["refreshed"] == 0
    assert yt.quota_used() == used
    assert sync.refresh_due(conn, yt, timedelta(0))["refreshed"] == 1


def test_save_video_from_unknown_channel_adds_it_untracked(conn, yt, fake):
    other = "UC" + "b" * 22
    fake.add_channel(other, title="Other", handle="@other")
    for i in range(3):
        fake.add_video(f"oth{i:08d}", 500, days_ago=15 + i, channel_id=other)
    fake.add_video("save0000001", 5000, days_ago=40, channel_id=other)

    vid = sync.save_video(conn, yt, "https://youtu.be/save0000001")

    assert vid == "save0000001"
    assert conn.execute("SELECT tracked FROM channels WHERE id = ?", (other,)).fetchone()[0] == 0
    assert video(conn, vid)["outlier_score"] == 10.0


def test_refresh_caches_small_avatar_and_keeps_old_copy_on_failure(conn, yt, fake, avatar_dir):
    fake.add_channel()
    fake.channels[CHANNEL_ID]["snippet"]["thumbnails"] = {"high": {"url": "http://img/avatar=s800-c-k"}}
    sync.add_channel(conn, yt, "@test")
    path = avatar_dir / f"{CHANNEL_ID}.jpg"
    assert path.read_bytes().startswith(b"\xff\xd8")

    # A rate-limited download leaves the cached copy alone.
    fake.missing_images.add("/avatar=s176-c-k")
    assert sync.cache_avatar(yt.http, CHANNEL_ID, "http://img/avatar=s800-c-k") is False
    assert path.exists()
