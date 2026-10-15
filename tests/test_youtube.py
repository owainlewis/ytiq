import pytest

from ytiq import config
from ytiq.youtube import QuotaExceeded, Ref, parse_duration, parse_ref


@pytest.mark.parametrize(
    "text, expected",
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", Ref("video", "dQw4w9WgXcQ")),
        ("https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ", Ref("video", "dQw4w9WgXcQ")),
        ("https://youtu.be/dQw4w9WgXcQ?t=3", Ref("video", "dQw4w9WgXcQ")),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", Ref("video", "dQw4w9WgXcQ")),
        ("https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa", Ref("channel_id", "UCaaaaaaaaaaaaaaaaaaaaaa")),
        ("https://www.youtube.com/@mkbhd/videos", Ref("handle", "mkbhd")),
        ("@mkbhd", Ref("handle", "mkbhd")),
        ("https://www.youtube.com/user/oldname", Ref("username", "oldname")),
        ("UCaaaaaaaaaaaaaaaaaaaaaa", Ref("channel_id", "UCaaaaaaaaaaaaaaaaaaaaaa")),
        ("dQw4w9WgXcQ", Ref("video", "dQw4w9WgXcQ")),
        ("Ali Abdaal", Ref("search", "Ali Abdaal")),
    ],
)
def test_parse_ref(text, expected):
    assert parse_ref(text) == expected


@pytest.mark.parametrize(
    "iso, seconds",
    [("PT10M", 600), ("PT1H2M3S", 3723), ("PT45S", 45), ("P1DT1H", 90000), ("P0D", 0), (None, 0), ("garbage", 0)],
)
def test_parse_duration(iso, seconds):
    assert parse_duration(iso) == seconds


def test_quota_is_tracked_and_enforced(yt, fake, monkeypatch):
    fake.add_channel()
    yt.channel(Ref("handle", "test"))
    assert yt.quota_used() == 1
    yt.channel(Ref("search", "anything"))  # search 100 + channels 1
    assert yt.quota_used() == 102

    monkeypatch.setattr(config, "DAILY_QUOTA_LIMIT", 102)
    with pytest.raises(QuotaExceeded):
        yt.channel(Ref("handle", "test"))
    assert yt.quota_used() == 102


def test_is_short_checks_youtube_only_for_short_durations(yt, fake):
    fake.shorts.add("short000001")
    assert yt.is_short("short000001", 45) is True
    assert yt.is_short("long0000001", 170) is False
    assert yt.is_short("short000001", 600) is False  # never asks for long videos
