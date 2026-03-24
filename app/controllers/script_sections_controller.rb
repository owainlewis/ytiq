class ScriptSectionsController < ApplicationController
  before_action :set_script
  before_action :set_section, only: [:update, :destroy]

  def create
    position = @script.script_sections.count
    @section = @script.script_sections.create!(
      title: "New Section",
      body: "",
      position: position
    )
    redirect_to project_path(@project, anchor: "section_#{@section.id}")
  end

  def update
    @section.update!(section_params)
    respond_to do |format|
      format.html { redirect_to project_path(@project) }
      format.turbo_stream { head :ok }
    end
  end

  def destroy
    @section.destroy
    redirect_to project_path(@project), notice: "Section removed."
  end

  private

  def set_script
    @project = current_user.projects.find(params[:project_id])
    @script = @project.script || @project.create_script!
  end

  def set_section
    @section = @script.script_sections.find(params[:id])
  end

  def section_params
    params.require(:script_section).permit(:title, :body, :position)
  end
end
