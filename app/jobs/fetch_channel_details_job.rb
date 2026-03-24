class FetchChannelDetailsJob < ApplicationJob
  queue_as :default

  def perform(channel_id)
    channel = Channel.find_by(id: channel_id)
    return unless channel

    client = Youtube::Client.new
    return unless client.quota_remaining?

    Youtube::VideoFetcher.new(client).fetch_for_channel(channel)
  end
end
