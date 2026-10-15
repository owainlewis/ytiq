import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
DB_PATH = Path(os.environ.get("YTIQ_DB_PATH", "data/ytiq.db"))
# Local copies of channel avatars. YouTube's image host rate-limits hotlinking.
AVATAR_DIR = Path(os.environ.get("YTIQ_AVATAR_DIR", str(DB_PATH.parent / "avatars")))
# On startup, skip channels refreshed within this many hours.
STARTUP_SKIP_HOURS = float(os.environ.get("YTIQ_STARTUP_SKIP_HOURS", "1"))

# YouTube gives each project 10,000 units a day. Stop short of that.
DAILY_QUOTA_LIMIT = int(os.environ.get("YTIQ_DAILY_QUOTA", "9000"))
