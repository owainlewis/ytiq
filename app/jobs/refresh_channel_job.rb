class RefreshChannelJob < ApplicationJob
  queue_as :default

  def perform(channel_id)
    channel = Channel.find_by(id: channel_id)
    return unless channel

    client = Youtube::Client.new
    return unless client.quota_remaining?

    # Re-fetch channel stats
    Youtube::ChannelFetcher.new(client).fetch(channel.youtube_channel_id)
    # Fetch latest videos
    Youtube::VideoFetcher.new(client).fetch_for_channel(channel)
  end
end
