namespace :channels do
  desc "Refresh all stale channels (not fetched in last 5 hours)"
  task refresh: :environment do
    stale_channels = Channel.joins(:user_channels).distinct
                            .where("last_fetched_at < ? OR last_fetched_at IS NULL", 12.hours.ago)
    puts "Refreshing #{stale_channels.count} stale channels..."

    client = Youtube::Client.new
    stale_channels.find_each do |channel|
      next unless client.quota_remaining?
      print "  #{channel.title}..."
      Youtube::ChannelFetcher.new(client).fetch(channel.youtube_channel_id)
      Youtube::VideoFetcher.new(client).fetch_for_channel(channel)
      puts " done"
    rescue => e
      puts " error: #{e.message}"
    end

    puts "Channel refresh complete."
  end
end
