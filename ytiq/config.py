import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# API keys are read through settings.py: saved in the app first, then these env vars.
# Data lives in ~/.ytiq so it stays put wherever the app is started from.
DB_PATH = Path(os.environ.get("YTIQ_DB_PATH", str(Path.home() / ".ytiq" / "ytiq.db")))
# Local copies of channel avatars. YouTube's image host rate-limits hotlinking.
AVATAR_DIR = Path(os.environ.get("YTIQ_AVATAR_DIR", str(DB_PATH.parent / "avatars")))
# On startup, skip channels refreshed within this many hours.
STARTUP_SKIP_HOURS = float(os.environ.get("YTIQ_STARTUP_SKIP_HOURS", "1"))

# Analyze: transcripts from Supadata, analysis from Claude.
ANALYSIS_MODEL = os.environ.get("YTIQ_ANALYSIS_MODEL", "claude-opus-5-5")

# YouTube gives each project 10,000 units a day. Stop short of that.
DAILY_QUOTA_LIMIT = int(os.environ.get("YTIQ_DAILY_QUOTA", "9000"))
