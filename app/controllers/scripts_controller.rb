class ScriptsController < ApplicationController
  before_action :set_project

  def update
    script = @project.script || @project.create_script!
    script.update!(script_params)
    respond_to do |format|
      format.html { redirect_to project_path(@project) }
      format.turbo_stream { head :ok }
    end
  end

  private

  def set_project
    @project = current_user.projects.find(params[:project_id])
  end

  def script_params
    params.require(:script).permit(:hook, :cta)
  end
end
