class SearchController < ApplicationController
  def show
    @query = params[:q].to_s.strip
    return if @query.blank?

    sort = params[:sort] || "outlier_score"
    published_after = params[:days].present? ? params[:days].to_i.days.ago.to_date : nil

    service = Youtube::SearchService.new
    videos = service.search(@query, published_after: published_after)

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
