class ProjectInspirationsController < ApplicationController
  before_action :set_project

  def create
    video = find_video
    if video.nil?
      redirect_to project_path(@project), alert: "Video not found."
      return
    end

    inspiration = @project.project_inspirations.build(
      video: video,
      note: params[:note],
      position: @project.project_inspirations.count
    )

    if inspiration.save
      redirect_to project_path(@project), notice: "Inspiration video added."
    else
      redirect_to project_path(@project), alert: "Video is already linked to this project."
    end
  end

  def destroy
    inspiration = @project.project_inspirations.find(params[:id])
    inspiration.destroy
    redirect_to project_path(@project), notice: "Inspiration video removed."
  end

  private

  def set_project
    @project = current_user.projects.find(params[:project_id])
  end

  def find_video
    input = (params[:video_url].presence || params[:query].to_s).strip
    return nil if input.blank?

    parsed = Youtube::UrlParser.parse(input)

    if parsed[:type] == :video_id
      # Look up locally first, then fetch from YouTube
      Video.find_by(youtube_video_id: parsed[:value]) || fetch_video_from_youtube(parsed[:value])
    else
      # Text search against local DB
      Video.where("title ILIKE ?", "%#{ActiveRecord::Base.sanitize_sql_like(input)}%").first
    end
  end

  def fetch_video_from_youtube(video_id)
    client = Youtube::Client.new
    video_data = client.videos_by_ids([ video_id ]).first
    return nil unless video_data

    # Ensure the channel exists locally
    channel_data = client.channels_by_id(video_data.snippet.channel_id)&.items&.first
    return nil unless channel_data

    channel = Channel.upsert_from_api(channel_data)

    Video.upsert_from_api(channel, video_data)
  rescue Youtube::QuotaExceededError
    nil
  end
end
