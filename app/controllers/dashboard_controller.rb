class DashboardController < ApplicationController
  def show
    channel_ids = current_user.channel_ids
    videos = Video.where(channel_id: channel_ids)
                  .includes(:channel)
                  .order(published_at: :desc)
    @pagy, @videos = pagy(videos, limit: 24)
  end
end
