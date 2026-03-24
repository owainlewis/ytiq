require "test_helper"

class CoachAnalysesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    sign_in @user
  end

  test "requires authentication" do
    sign_out @user
    get coach_analyses_path
    assert_redirected_to new_user_session_path
  end

  test "index lists user analyses" do
    get coach_analyses_path
    assert_response :success
  end

  test "show displays own analysis" do
    analysis = coach_analyses(:one)
    get coach_analysis_path(analysis)
    assert_response :success
  end

  test "show cannot access other user analysis" do
    other_analysis = CoachAnalysis.create!(
      user: users(:two),
      analyzable: channels(:two),
      analysis_type: "channel_review",
      status: "completed"
    )

    get coach_analysis_path(other_analysis)
    assert_response :not_found
  end

  test "create channel_review for tracked channel" do
    assert_difference("CoachAnalysis.count") do
      assert_enqueued_with(job: CoachAnalysisJob) do
        post coach_analyses_path, params: {
          analysis_type: "channel_review",
          channel_id: channels(:one).id
        }
      end
    end
  end

  test "create channel_review for untracked channel redirects" do
    post coach_analyses_path, params: {
      analysis_type: "channel_review",
      channel_id: channels(:two).id
    }
    assert_redirected_to coach_analyses_path
    assert_equal "Resource not found or not accessible.", flash[:alert]
  end

  test "create with invalid analysis_type redirects" do
    post coach_analyses_path, params: { analysis_type: "invalid" }
    assert_redirected_to coach_analyses_path
    assert_equal "Invalid analysis type.", flash[:alert]
  end
end
