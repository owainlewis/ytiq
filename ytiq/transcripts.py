"""Transcripts from Supadata (https://supadata.ai).

YouTube blocks transcript scraping from cloud servers, so a hosted service
fetches them. In the default `auto` mode Supadata uses the video's captions
(1 credit) and falls back to AI transcription when there are none
(2 credits per minute). Videos over 20 minutes come back as a job to poll.
"""

import time

import httpx

from ytiq import config

API = "https://api.supadata.ai/v1"
POLL_SECONDS = 1.0
POLL_TIMEOUT = 300.0


class TranscriptError(Exception):
    pass


class Transcripts:
    def __init__(self, api_key: str | None = None, http: httpx.Client | None = None, sleep=time.sleep):
        self.api_key = api_key if api_key is not None else config.SUPADATA_API_KEY
        self.http = http or httpx.Client(timeout=60)
        self.sleep = sleep

    def get(self, video_id: str) -> str | None:
        """Plain-text transcript, or None if the video has no speech or no transcript."""
        if not self.api_key:
            raise TranscriptError("SUPADATA_API_KEY is not set. Add it to .env to analyze videos.")
        params = {"url": f"https://www.youtube.com/watch?v={video_id}", "text": "true", "mode": "auto"}
        r = self._get("/transcript", params)
        if r.status_code == 206:
            return None
        if r.status_code == 202:
            return self._wait(r.json()["jobId"])
        return r.json().get("content") or None

    def _wait(self, job_id: str) -> str | None:
        deadline = time.monotonic() + POLL_TIMEOUT
        while time.monotonic() < deadline:
            job = self._get(f"/transcript/{job_id}").json()
            if job["status"] == "completed":
                return job.get("content") or None
            if job["status"] == "failed":
                error = job.get("error") or {}
                if error.get("error") == "transcript-unavailable":
                    return None
                raise TranscriptError(error.get("message") or "Transcript job failed")
            self.sleep(POLL_SECONDS)
        raise TranscriptError("Timed out waiting for the transcript")

    def _get(self, path: str, params: dict | None = None) -> httpx.Response:
        r = self.http.get(API + path, params=params, headers={"x-api-key": self.api_key})
        if r.status_code >= 400:
            try:
                message = r.json().get("message") or r.text
            except ValueError:
                message = r.text
            raise TranscriptError(f"Supadata error {r.status_code}: {message}")
        return r
