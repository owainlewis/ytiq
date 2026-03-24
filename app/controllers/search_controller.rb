class SearchController < ApplicationController
  def show
    @query = params[:q].to_s.strip
    return if @query.blank?

    sort = params[:sort] || "outlier_score"
    min_outlier = params[:min_outlier].to_f
    min_views = params[:min_views].to_i
    max_views = params[:max_views].to_i
    min_subs = params[:min_subs].to_i
    max_subs = params[:max_subs].to_i
    published_after = params[:days].present? ? params[:days].to_i.days.ago.to_date : nil

    service = Youtube::SearchService.new
    videos = service.search(@query, published_after: published_after)

    # Apply filters
    videos = videos.select { |v| v.outlier_score.to_f >= min_outlier } if min_outlier > 0
    videos = videos.select { |v| v.view_count.to_i >= min_views } if min_views > 0
    videos = videos.select { |v| v.view_count.to_i <= max_views } if max_views > 0
    videos = videos.select { |v| v.channel.subscriber_count.to_i >= min_subs } if min_subs > 0
    videos = videos.select { |v| v.channel.subscriber_count.to_i <= max_subs } if max_subs > 0

    @videos = case sort
    when "outlier_score" then videos.sort_by { |v| -(v.outlier_score || 0) }
    when "view_count" then videos.sort_by { |v| -v.view_count.to_i }
    when "published_at" then videos.sort_by { |v| -(v.published_at&.to_i || 0) }
    else videos
    end
  rescue Youtube::QuotaExceededError
    @error = "YouTube API quota exceeded for today. Try again tomorrow."
    @videos = []
  end
end
