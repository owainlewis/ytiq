class SettingsController < ApplicationController
  def show
  end

  def update
    # Handle removal
    if params.dig(:user, :own_channel_id) == ""
      current_user.update!(own_channel_id: nil)
      redirect_to settings_path, notice: "Channel removed."
      return
    end

    # Handle channel query lookup
    query = params[:channel_query]
    if query.blank?
      redirect_to settings_path, alert: "Please enter a channel URL or handle."
      return
    end

    channel = Youtube::ChannelFetcher.new.fetch(query)
    if channel
      current_user.update!(own_channel: channel)
      redirect_to settings_path, notice: "Channel set to #{channel.title}."
    else
      redirect_to settings_path, alert: "Could not find that channel."
    end
  rescue Youtube::QuotaExceededError
    redirect_to settings_path, alert: "YouTube API quota exceeded. Try again later."
  end
end
