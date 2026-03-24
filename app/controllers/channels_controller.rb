class ChannelsController < ApplicationController
  def index
    @channels = current_user.channels.order(:title)
  end

  def show
    @channel = Channel.find(params[:id])
    sort = params[:sort] || "published_at"
    direction = params[:direction] || "desc"

    allowed_sorts = %w[published_at view_count outlier_score]
    sort = "published_at" unless allowed_sorts.include?(sort)
    direction = "desc" unless %w[asc desc].include?(direction)

    @pagy, @videos = pagy(@channel.videos.order(sort => direction), limit: 24)
    @is_tracked = current_user.channels.exists?(@channel.id)
  end

  def create
    input = params[:query].to_s.strip
    if input.blank?
      redirect_to channels_path, alert: "Please enter a channel URL, handle, or name."
      return
    end

    channel = Youtube::ChannelFetcher.new.fetch(input)
    if channel
      current_user.channels << channel unless current_user.channels.exists?(channel.id)
      FetchChannelDetailsJob.perform_later(channel.id)
      redirect_to channel_path(channel), notice: "Channel added! Videos are being fetched."
    else
      redirect_to channels_path, alert: "Could not find that channel."
    end
  rescue Youtube::QuotaExceededError
    redirect_to channels_path, alert: "YouTube API quota exceeded. Try again tomorrow."
  end

  def destroy
    channel = current_user.channels.find(params[:id])
    current_user.channels.delete(channel)
    redirect_to channels_path, notice: "Channel unfollowed."
  end
end
