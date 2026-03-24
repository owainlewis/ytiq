module Youtube
  class Client
    DAILY_QUOTA_LIMIT = 9000

    def initialize
      @service = Google::Apis::YoutubeV3::YouTubeService.new
      @service.key = ENV.fetch("YOUTUBE_API_KEY")
    end

    def channels_by_id(channel_id)
      track_quota(1)
      @service.list_channels("snippet,statistics", id: channel_id)
    end

    def channels_by_handle(handle)
      track_quota(1)
      @service.list_channels("snippet,statistics", for_handle: handle)
    end

    def search_channels(query, max_results: 5)
      track_quota(100)
      @service.list_searches("snippet", q: query, type: "channel", max_results: max_results)
    end

    def search_videos(query, max_results: 25, order: "viewCount", published_after: nil, video_duration: "medium")
      track_quota(100)
      params = { q: query, type: "video", max_results: max_results, order: order, video_duration: video_duration }
      params[:published_after] = published_after.to_time.utc.iso8601 if published_after
      @service.list_searches("snippet", **params)
    end

    def videos_by_ids(video_ids)
      # Batch up to 50 IDs per call (1 unit each)
      video_ids.each_slice(50).flat_map do |batch|
        track_quota(1)
        response = @service.list_videos("snippet,statistics,contentDetails", id: batch.join(","))
        response.items
      end
    end

    def channel_videos(channel_id, max_results: 50)
      track_quota(100)
      response = @service.list_searches("snippet", channel_id: channel_id, type: "video",
                                         order: "date", max_results: max_results)
      video_ids = response.items.map { |item| item.id.video_id }
      return [] if video_ids.empty?
      videos_by_ids(video_ids)
    end

    def quota_remaining?
      current_tracker.units_used < DAILY_QUOTA_LIMIT
    end

    private

    def current_tracker
      @current_tracker = nil if @current_tracker&.date != Date.current
      @current_tracker ||= ApiQuotaTracker.find_or_create_by(date: Date.current) { |t| t.units_used = 0 }
    end

    def track_quota(units)
      tracker = current_tracker
      raise QuotaExceededError, "Daily YouTube API quota exceeded" if tracker.units_used + units > DAILY_QUOTA_LIMIT
      tracker.increment!(:units_used, units)
    end
  end

  class QuotaExceededError < StandardError; end
end
