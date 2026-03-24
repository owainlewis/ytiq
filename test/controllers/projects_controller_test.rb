require "test_helper"

class ProjectsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @project = projects(:one)
    sign_in @user
  end

  test "requires authentication" do
    sign_out @user
    get projects_path
    assert_redirected_to new_user_session_path
  end

  test "index lists user projects" do
    get projects_path
    assert_response :success
    assert_match @project.title, response.body
  end

  test "index does not show other user projects" do
    get projects_path
    assert_response :success
    refute_match projects(:two).title, response.body
  end

  test "show displays project" do
    get project_path(@project)
    assert_response :success
  end

  test "show cannot access other user project" do
    get project_path(projects(:two))
    assert_response :not_found
  end

  test "new renders form" do
    get new_project_path
    assert_response :success
  end

  test "create with valid params" do
    assert_difference("Project.count") do
      post projects_path, params: { project: { title: "New Video Idea" } }
    end
    assert_redirected_to project_path(Project.last)
  end

  test "create with blank title fails" do
    assert_no_difference("Project.count") do
      post projects_path, params: { project: { title: "" } }
    end
    assert_response :unprocessable_entity
  end

  test "edit renders form" do
    get edit_project_path(@project)
    assert_response :success
  end

  test "update with valid params" do
    patch project_path(@project), params: { project: { title: "Updated Title" } }
    assert_redirected_to project_path(@project)
    assert_equal "Updated Title", @project.reload.title
  end

  test "destroy removes project" do
    assert_difference("Project.count", -1) do
      delete project_path(@project)
    end
    assert_redirected_to projects_path
  end

  test "generate_analysis creates analysis and enqueues job" do
    assert_difference("CoachAnalysis.count") do
      assert_enqueued_with(job: CoachAnalysisJob) do
        post generate_analysis_project_path(@project)
      end
    end
  end
end
