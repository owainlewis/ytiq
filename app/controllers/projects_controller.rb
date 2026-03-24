class ProjectsController < ApplicationController
  before_action :set_project, only: [:show, :edit, :update, :destroy, :generate_analysis]

  def index
    @pagy, @projects = pagy(current_user.projects.includes(:project_inspirations).recent, limit: 20)
  end

  def show
    @inspirations = @project.project_inspirations.includes(video: :channel)
  end

  def new
    @project = current_user.projects.build
  end

  def create
    @project = current_user.projects.build(project_params)
    @project.channel = current_user.own_channel
    if @project.save
      redirect_to project_path(@project), notice: "Project created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @project.update(project_params)
      respond_to do |format|
        format.html { redirect_to project_path(@project), notice: "Project updated." }
        format.turbo_stream
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @project.destroy
    redirect_to projects_path, notice: "Project deleted."
  end

  def generate_analysis
    analysis = current_user.coach_analyses.create!(
      analyzable: @project,
      analysis_type: "plan_research",
      status: "pending"
    )
    CoachAnalysisJob.perform_later(analysis.id)
    redirect_to coach_analysis_path(analysis)
  end

  private

  def set_project
    @project = current_user.projects.find(params[:id])
  end

  def project_params
    params.require(:project).permit(
      :title, :gap_analysis, :angle,
      :title_candidate_1, :title_candidate_2, :title_candidate_3,
      :chosen_title, :reflections, :thumbnail,
      :checklist_title, :checklist_thumbnail, :checklist_script,
      :checklist_recorded, :checklist_edited, :checklist_published
    )
  end
end
