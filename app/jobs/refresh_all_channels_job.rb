class RefreshAllChannelsJob < ApplicationJob
  queue_as :default

  def perform
    # Only refresh channels that haven't been fetched in the last 5 hours
    stale_channels = Channel.joins(:user_channels).distinct
                            .where("last_fetched_at < ? OR last_fetched_at IS NULL", 12.hours.ago)

    stale_channels.find_each do |channel|
      RefreshChannelJob.perform_later(channel.id)
    end
  end
end
