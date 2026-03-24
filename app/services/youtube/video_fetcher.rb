module Youtube
  class VideoFetcher
    def initialize(client = Youtube::Client.new)
      @client = client
    end

    def fetch_for_channel(channel)
      videos_data = @client.channel_videos(channel.youtube_channel_id)

      videos_data.map do |video_data|
        Video.upsert_from_api(channel, video_data)
      end.compact.reject(&:short?).tap do
        Youtube::OutlierCalculator.new.update_channel(channel)
      end
    end
  end
end
