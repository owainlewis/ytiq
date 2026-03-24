class CoachAnalysesController < ApplicationController
  def index
    @pagy, @analyses = pagy(
      current_user.coach_analyses.recent.includes(:analyzable),
      limit: 20
    )
  end

  def show
    @analysis = current_user.coach_analyses.find(params[:id])
  end

  def create
    analysis_type = params[:analysis_type]

    analyzable = case analysis_type
    when "channel_review"
      current_user.channels.find(params[:channel_id])
    when "video_review"
      Video.joins(:channel).where(channels: { id: current_user.channel_ids }).find(params[:video_id])
    else
      redirect_to coach_analyses_path, alert: "Invalid analysis type."
      return
    end

    analysis = current_user.coach_analyses.create!(
      analyzable: analyzable,
      analysis_type: analysis_type,
      status: "pending"
    )

    CoachAnalysisJob.perform_later(analysis.id)
    redirect_to coach_analysis_path(analysis)
  rescue ActiveRecord::RecordNotFound
    redirect_to coach_analyses_path, alert: "Resource not found or not accessible."
  end
end
