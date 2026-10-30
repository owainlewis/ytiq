# ytiq

A personal YouTube research tool. Track creators in your niche, spot breakout videos, and keep a swipe file.

- **Feed**: latest uploads from the channels you track.
- **Outliers**: videos beating their channel's usual views, plus what is growing fastest right now.
- **Boards**: a swipe file. Save any video, from the feed or any YouTube link, with notes.

## Run it

You need [uv](https://docs.astral.sh/uv/getting-started/installation/). Then one command:

```bash
uvx --from git+https://github.com/owainlewis/ytiq ytiq
```

ytiq opens in your browser and walks you through setup:

1. **Connect YouTube.** Paste a free YouTube Data API key. The screen shows how to get one, and checks the key before saving it.
2. **Turn on Analyze** (optional). Add a [Supadata](https://supadata.ai) key for transcripts and a [Claude](https://console.anthropic.com) key for the breakdown. You can skip this and add them later in Settings.
3. **Add channels.** Paste a few creators from your niche and ytiq pulls their recent videos.

Keys are saved on your computer in `~/.ytiq`, along with your data. Change them any time in Settings (bottom of the sidebar). Run the same command to start ytiq again. To get the latest version, add `--refresh` after `uvx`.

If you prefer, keys can also go in a `.env` file or environment variables (see `.env.example`). A key saved in the app wins over one in `.env`.

## How scores work

**Outlier score** = video views ÷ the channel's median views. The median comes from the channel's last 30 videos of the same format (long-form or Shorts) that are at least 7 days old. The median is used because one viral hit would distort an average.

Videos under 7 days old are tagged **early**. Their score is low-biased because they have had less time to collect views.

**Views/day** comes from view-count snapshots taken on each refresh (for videos under 60 days old). **Rising** sorts by views/day relative to channel size, so a small channel's breakout ranks alongside big ones.

## Quota

YouTube gives 10,000 units a day. Refreshing a channel costs 3 units (channel stats + uploads playlist + video stats), so a full refresh of 50 channels is about 150 units. Adding a channel by name, not URL or @handle, uses search and costs 100. Usage shows at the bottom of the sidebar. The app stops at 9,000 (`YTIQ_DAILY_QUOTA`).

Channels refresh when the app starts and when you press refresh in the sidebar. There is no background timer. On startup, channels refreshed in the last `YTIQ_STARTUP_SKIP_HOURS` (default 1) are skipped, so restarts are free. View snapshots are taken on each refresh, so views/day needs at least two refreshes about a day apart.

## Development

```bash
cp .env.example .env             # optional: keys and a local data folder
uv run pytest                    # backend tests
uv run ytiq --reload             # API on :8000

cd web && pnpm install
pnpm dev                         # UI with hot reload on :5173, proxies /api to :8000
pnpm build                       # builds into ytiq/static, served by FastAPI
```

Code layout:

- `ytiq/youtube.py`: API client, URL parsing
- `ytiq/sync.py`: fetch, store, score, avatar cache
- `ytiq/app.py`: API, scheduler, serves the built UI
- `ytiq/settings.py`: API keys saved from the setup screen
- `web/`: React + TypeScript + Tailwind + shadcn/ui, built into `ytiq/static/`

Data lives in `~/.ytiq/` by default (SQLite database and cached channel avatars). Set `YTIQ_DB_PATH` to move it.
