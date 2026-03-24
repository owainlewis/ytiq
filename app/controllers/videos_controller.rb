class VideosController < ApplicationController
  def index
    videos = Video.includes(:channel)

    if params[:min_outlier].present?
      videos = videos.where("outlier_score >= ?", params[:min_outlier].to_f)
    end
    if params[:min_views].present?
      videos = videos.where("view_count >= ?", params[:min_views].to_i)
    end

    sort = params[:sort] || "outlier_score"
    direction = params[:direction] || "desc"
    allowed_sorts = %w[published_at view_count outlier_score]
    sort = "outlier_score" unless allowed_sorts.include?(sort)
    direction = "desc" unless %w[asc desc].include?(direction)

    @pagy, @videos = pagy(videos.order(sort => direction), limit: 24)
  end
end
