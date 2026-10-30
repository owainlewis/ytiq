"""Study a video with Claude: topic, angle, main points and hook.

One request per video. Claude gets the title, description, thumbnail and
transcript, and returns a fixed structure so the UI can lay it out.
"""

import base64

import anthropic
import httpx
import pydantic
from pydantic import BaseModel, Field

from ytiq import config


class Hook(BaseModel):
    spoken: str | None = Field(
        description="The opening line(s), quoted or closely paraphrased from the first seconds of the transcript. "
        "null when there is no transcript: never invent one."
    )
    visual: str = Field(description="What the thumbnail and title promise at a glance, and how they work together.")
    why_it_works: str = Field(description="Why the hook makes a viewer click and keep watching.")


class Analysis(BaseModel):
    summary: str = Field(description="Two or three sentences on what the video covers.")
    topic: str = Field(description="The subject in a few words, as a viewer would search for it.")
    angle: str = Field(description="The specific take on the topic that makes this video different from others on it.")
    format: str = Field(description="The storytelling format, e.g. tutorial, breakdown, case study, reaction, list, challenge.")
    main_points: list[str] = Field(description="The main points or steps in the order the video makes them. Three to eight items.")
    hook: Hook


SYSTEM = """You study YouTube videos for a creator who wants to understand why they perform.
Be specific to this video. Quote or name concrete details rather than describing them in general terms.
Write in plain, simple words."""


class AnalysisError(Exception):
    pass


class Analyzer:
    def __init__(
        self,
        client: anthropic.Anthropic | None = None,
        model: str | None = None,
        http: httpx.Client | None = None,
        api_key: str = "",
    ):
        self.client = client
        self.api_key = api_key
        self.model = model or config.ANALYSIS_MODEL
        self.http = http or httpx.Client(timeout=10, follow_redirects=True)

    def check(self) -> None:
        """Fail before spending a transcript credit if Claude can't be called."""
        if self.client is None and not self.api_key:
            raise AnalysisError("Add your Claude API key in Settings to analyze videos.")

    def analyze(self, video: dict, transcript: str | None) -> Analysis:
        self.check()
        if self.client is None:
            self.client = anthropic.Anthropic(api_key=self.api_key)

        length = "Short" if video["is_short"] else f"{(video['duration_seconds'] or 0) // 60} minutes"
        details = (
            f"Title: {video['title']}\n"
            f"Channel: {video['channel_title']}\n"
            f"Views: {video['view_count']} ({video['outlier_score'] or 0:.1f}x the channel's median)\n"
            f"Length: {length}\n\n"
            f"Description:\n{video['description'] or '(none)'}\n\n"
        )
        if transcript:
            details += f"<transcript>\n{transcript}\n</transcript>"
        else:
            details += "No transcript is available. Work from the title, description and thumbnail, and say so in the summary."

        content: list[dict] = []
        if thumbnail := self.thumbnail(video["thumbnail_url"]):
            content.append(thumbnail)
        content.append({"type": "text", "text": details})

        try:
            response = self.client.messages.parse(
                model=self.model,
                max_tokens=16000,
                system=SYSTEM,
                messages=[{"role": "user", "content": content}],
                output_format=Analysis,
            )
        except pydantic.ValidationError as e:
            raise AnalysisError("Claude's answer was cut off or incomplete. Try again.") from e
        except anthropic.APIStatusError as e:
            raise AnalysisError(f"Claude error {e.status_code}: {e.message}") from e
        except anthropic.APIConnectionError as e:
            raise AnalysisError("Could not reach Claude. Check your connection.") from e
        if response.stop_reason == "refusal" or response.parsed_output is None:
            raise AnalysisError("Claude could not analyze this video.")
        return response.parsed_output

    def thumbnail(self, url: str | None) -> dict | None:
        """The thumbnail as an image block. It's helpful context, so a failed download just leaves it out."""
        if not url:
            return None
        try:
            r = self.http.get(url)
            r.raise_for_status()
        except httpx.HTTPError:
            return None
        media_type = r.headers.get("content-type", "image/jpeg").split(";")[0]
        if media_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            return None
        data = base64.standard_b64encode(r.content).decode()
        return {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": data}}
