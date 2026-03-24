# YTIQ

YouTube analytics and research tool for creators. Track channels, discover outlier videos, and get AI-powered coaching on your content strategy.

## Features

- **Channel Tracking** — Add YouTube channels and monitor their video performance over time
- **Outlier Detection** — Automatically scores videos against channel averages to surface breakout content
- **Video Search** — Search YouTube with filters for views, outlier score, subscriber count, and recency
- **AI Coach** — Get AI-powered analysis of channels, videos, and video project plans
- **Projects** — Plan new videos with inspiration boards, title candidates, checklists, and AI research

## Tech Stack

- Ruby 3.3 / Rails 8
- PostgreSQL
- Hotwire (Turbo + Stimulus)
- Tailwind CSS
- Devise + OmniAuth (Google)
- YouTube Data API v3
- Anthropic Claude API (AI coaching)

## Setup

```bash
git clone git@github.com:owainlewis/ytiq.git
cd ytiq
bundle install
bin/rails db:setup
```

### Environment Variables

Create a `.env` file in the project root:

```
YOUTUBE_API_KEY=your_youtube_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

### Running

```bash
bin/dev
```

### Tests

```bash
bin/rails test
```

## License

Private.
