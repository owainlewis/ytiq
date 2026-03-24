# Roadmap

## Testing

### Priorities

1. **Controller tests** — Cover auth, scoping, and happy/sad paths for all controllers
2. **Job tests** — Verify jobs call the right services and handle failures
3. **Service tests for API wrappers** — Youtube::Client, Coach::Client with stubbed HTTP
4. **System tests** — Low priority, defer until app stabilizes

### Coverage gaps (as of 2026-03-24)

- [x] Model tests (User, Channel, Video, UserChannel, ApiQuotaTracker, CoachAnalysis)
- [x] Service tests (UrlParser, OutlierCalculator, DataFingerprint, ChannelPromptBuilder, VideoPromptBuilder)
- [x] Controller tests (Channels, Videos, Dashboard, Pages, Projects, CoachAnalyses, Settings)
- [ ] Job tests (FetchChannelDetailsJob, RefreshChannelJob, CoachAnalysisJob, RefreshAllChannelsJob)
- [ ] Service tests (Youtube::Client, Youtube::ChannelFetcher, Youtube::VideoFetcher, Youtube::SearchService, Coach::Analyzer, Coach::Client, Coach::ProjectPromptBuilder)
- [ ] System/integration tests

## Known issues

See code review findings (2026-03-24):

- SQL injection pattern in OutlierCalculator (string interpolation in Arel.sql)
- VideosController#index exposes all videos to all users (no user scoping)
- Race condition in ApiQuotaTracker (stale in-memory reads)
- Duplicate channel add race condition in ChannelsController#create
