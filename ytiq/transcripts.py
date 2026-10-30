"""Transcripts from Supadata (https://supadata.ai).

YouTube blocks transcript scraping from cloud servers, so a hosted service
fetches them. In the default `auto` mode Supadata uses the video's captions
(1 credit) and falls back to AI transcription when there are none
(2 credits per minute). Videos over 20 minutes come back as a job to poll.
"""

import time

import httpx

API = "https://api.supadata.ai/v1"
POLL_SECONDS = 1.0
POLL_TIMEOUT = 300.0


class TranscriptError(Exception):
    pass


class Transcripts:
    def __init__(self, api_key: str = "", http: httpx.Client | None = None, sleep=time.sleep):
        self.api_key = api_key
        self.http = http or httpx.Client(timeout=60)
        self.sleep = sleep

    def get(self, video_id: str) -> str | None:
        """Plain-text transcript, or None if the video has no speech or no transcript."""
        if not self.api_key:
            raise TranscriptError("Add your Supadata API key in Settings to analyze videos.")
        params = {"url": f"https://www.youtube.com/watch?v={video_id}", "text": "true", "mode": "auto"}
        status, body = self._get("/transcript", params)
        if status == 206:
            return None
        if status == 202:
            return self._wait(body["jobId"])
        return body.get("content") or None

    def _wait(self, job_id: str) -> str | None:
        deadline = time.monotonic() + POLL_TIMEOUT
        while time.monotonic() < deadline:
            _, job = self._get(f"/transcript/{job_id}")
            if job["status"] == "completed":
                return job.get("content") or None
            if job["status"] == "failed":
                error = job.get("error") or {}
                if error.get("error") == "transcript-unavailable":
                    return None
                raise TranscriptError(error.get("message") or "Transcript job failed")
            self.sleep(POLL_SECONDS)
        raise TranscriptError("Timed out waiting for the transcript")

    def _get(self, path: str, params: dict | None = None) -> tuple[int, dict]:
        try:
            r = self.http.get(API + path, params=params, headers={"x-api-key": self.api_key})
        except httpx.HTTPError as e:
            raise TranscriptError(f"Could not reach Supadata: {e}") from e
        try:
            body = r.json() if r.content else {}
        except ValueError:
            body = {}
        if r.status_code >= 400:
            raise TranscriptError(f"Supadata error {r.status_code}: {body.get('message') or r.text}")
        is_job_poll = path != "/transcript"
        if (r.status_code == 202 and "jobId" not in body) or (is_job_poll and "status" not in body):
            raise TranscriptError(f"Unexpected response from Supadata: {r.text[:200]}")
        return r.status_code, body
