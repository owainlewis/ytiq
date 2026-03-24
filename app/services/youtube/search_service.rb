module Youtube
  class SearchService
    def initialize(client = Youtube::Client.new)
      @client = client
      @channel_cache = {}
    end

    def search(query, max_results: 25, order: "viewCount", published_after: nil)
      results = @client.search_videos(query, max_results: max_results, order: order, published_after: published_after)

      video_ids = results.items.map { |item| item.id.video_id }
      return [] if video_ids.empty?

      videos_data = @client.videos_by_ids(video_ids)

      videos_data.map do |video_data|
        channel = find_or_fetch_channel(video_data.snippet.channel_id)
        Video.upsert_from_api(channel, video_data) if channel
      end.compact.reject(&:short?).tap do |videos|
        channels = videos.map(&:channel).uniq
        calculator = Youtube::OutlierCalculator.new
        channels.each { |ch| calculator.update_channel(ch) }
      end
    end

    private

    def find_or_fetch_channel(channel_id)
      @channel_cache[channel_id] ||= begin
        Channel.find_by(youtube_channel_id: channel_id) ||
          Youtube::ChannelFetcher.new(@client).fetch(channel_id)
      end
    rescue => e
      Rails.logger.warn "Failed to fetch channel #{channel_id}: #{e.message}"
      nil
    end
  end
end
