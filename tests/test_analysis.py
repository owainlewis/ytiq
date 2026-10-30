import httpx
import pytest

from ytiq import app as app_module
from ytiq.analysis import Analysis, AnalysisError, Hook
from ytiq.transcripts import TranscriptError, Transcripts


def supadata(responses: list[httpx.Response]) -> tuple[Transcripts, list[httpx.Request]]:
    """A Transcripts client whose requests get the given responses in order."""
    seen: list[httpx.Request] = []

    def handler(request):
        seen.append(request)
        return responses.pop(0)

    return Transcripts(api_key="key", http=httpx.Client(transport=httpx.MockTransport(handler)), sleep=lambda s: None), seen


def test_transcript_from_captions():
    t, seen = supadata([httpx.Response(200, json={"content": "hello world", "lang": "en"})])
    assert t.get("abcdefghijk") == "hello world"
    assert seen[0].headers["x-api-key"] == "key"
    assert seen[0].url.params["url"] == "https://www.youtube.com/watch?v=abcdefghijk"
    assert seen[0].url.params["mode"] == "auto"


def test_transcript_long_video_polls_job():
    t, seen = supadata([
        httpx.Response(202, json={"jobId": "job1"}),
        httpx.Response(200, json={"status": "active"}),
        httpx.Response(200, json={"status": "completed", "content": "long transcript"}),
    ])
    assert t.get("abcdefghijk") == "long transcript"
    assert seen[-1].url.path == "/v1/transcript/job1"


def test_transcript_unavailable_is_none():
    t, _ = supadata([httpx.Response(206, json={})])
    assert t.get("abcdefghijk") is None


def test_transcript_errors():
    t, _ = supadata([httpx.Response(401, json={"message": "Invalid API key"})])
    with pytest.raises(TranscriptError, match="Invalid API key"):
        t.get("abcdefghijk")
    with pytest.raises(TranscriptError, match="Supadata API key"):
        Transcripts(api_key="").get("abcdefghijk")


ANALYSIS = Analysis(
    summary="A walkthrough.",
    topic="Claude Code",
    angle="Beginner friendly",
    format="tutorial",
    main_points=["one", "two", "three"],
    hook=Hook(spoken="Watch this.", visual="Big red arrow.", why_it_works="Curiosity."),
)


class FakeTranscripts:
    def __init__(self, text="the transcript"):
        self.text, self.calls = text, 0

    def get(self, video_id):
        self.calls += 1
        return self.text


class FakeAnalyzer:
    model = "test-model"

    def __init__(self, error=None):
        self.error, self.seen = error, []

    def check(self):
        if self.error:
            raise self.error

    def analyze(self, video, transcript):
        if self.error:
            raise self.error
        self.seen.append((video, transcript))
        return ANALYSIS


@pytest.fixture
def services(client):
    transcripts, analyzer = FakeTranscripts(), FakeAnalyzer()
    app_module.app.dependency_overrides[app_module.get_transcripts] = lambda: transcripts
    app_module.app.dependency_overrides[app_module.get_analyzer] = lambda: analyzer
    return transcripts, analyzer


def add_video(client, fake):
    fake.add_channel()
    for i in range(3):
        fake.add_video(f"vid{i:08d}", 1000, days_ago=10 + i)
    client.post("/api/channels", json={"input": "@test"})
    return "vid00000000"


def test_analyze_stores_and_reuses(client, fake, services):
    transcripts, analyzer = services
    vid = add_video(client, fake)
    assert client.get(f"/api/videos/{vid}").json()["analysis"] is None

    r = client.post(f"/api/videos/{vid}/analysis")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["topic"] == "Claude Code"
    assert body["hook"]["spoken"] == "Watch this."
    assert body["has_transcript"] is True and body["model"] == "test-model"
    video, transcript = analyzer.seen[0]
    assert video["title"] == f"Video {vid}" and transcript == "the transcript"

    assert client.get(f"/api/videos/{vid}").json()["analysis"]["angle"] == "Beginner friendly"

    # Stored: a second click costs nothing. Redo asks Claude again but reuses the transcript.
    client.post(f"/api/videos/{vid}/analysis")
    assert transcripts.calls == 1 and len(analyzer.seen) == 1
    client.post(f"/api/videos/{vid}/analysis", params={"redo": True})
    assert transcripts.calls == 1 and len(analyzer.seen) == 2


def test_analyze_without_transcript(client, fake, services):
    services[0].text = None
    vid = add_video(client, fake)
    assert client.post(f"/api/videos/{vid}/analysis").json()["has_transcript"] is False


def test_analyze_errors(client, fake, services):
    assert client.post("/api/videos/nope0000000/analysis").status_code == 404
    vid = add_video(client, fake)
    app_module.app.dependency_overrides[app_module.get_analyzer] = lambda: FakeAnalyzer(AnalysisError("ANTHROPIC_API_KEY is not set"))
    r = client.post(f"/api/videos/{vid}/analysis")
    assert r.status_code == 502 and "ANTHROPIC_API_KEY" in r.json()["detail"]
    assert services[0].calls == 0  # no transcript credit spent
    assert client.get(f"/api/videos/{vid}").json()["analysis"] is None


def test_transcript_network_and_bad_body_errors():
    def boom(request):
        raise httpx.ConnectError("down")

    t = Transcripts(api_key="key", http=httpx.Client(transport=httpx.MockTransport(boom)))
    with pytest.raises(TranscriptError, match="Could not reach Supadata"):
        t.get("abcdefghijk")
    t, _ = supadata([httpx.Response(202, json={})])
    with pytest.raises(TranscriptError, match="Unexpected response"):
        t.get("abcdefghijk")


def test_failed_analysis_keeps_paid_transcript(client, fake, services):
    transcripts, _ = services
    vid = add_video(client, fake)
    failing = FakeAnalyzer()
    failing.analyze = lambda video, transcript: (_ for _ in ()).throw(AnalysisError("overloaded"))
    app_module.app.dependency_overrides[app_module.get_analyzer] = lambda: failing
    assert client.post(f"/api/videos/{vid}/analysis").status_code == 502

    app_module.app.dependency_overrides[app_module.get_analyzer] = lambda: FakeAnalyzer()
    assert client.post(f"/api/videos/{vid}/analysis").status_code == 200
    assert transcripts.calls == 1  # the retry reused the stored transcript


def test_cut_off_answer_is_analysis_error():
    import anthropic
    import httpx2

    from ytiq.analysis import Analyzer

    def handler(request):
        return httpx2.Response(200, json={
            "id": "m", "type": "message", "role": "assistant", "model": "x",
            "content": [{"type": "text", "text": '{"summary": "cut'}],
            "stop_reason": "max_tokens", "stop_sequence": None, "usage": {"input_tokens": 1, "output_tokens": 1},
        })

    claude = anthropic.Anthropic(api_key="x", http_client=anthropic.DefaultHttpxClient(transport=httpx2.MockTransport(handler)))
    video = {"title": "T", "channel_title": "C", "view_count": 1, "outlier_score": 1.0, "is_short": False,
             "duration_seconds": 60, "description": "", "thumbnail_url": None}
    with pytest.raises(AnalysisError, match="cut off"):
        Analyzer(client=claude).analyze(video, "words")
