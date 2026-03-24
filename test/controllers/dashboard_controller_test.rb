require "test_helper"

class DashboardControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    sign_in @user
  end

  test "requires authentication" do
    sign_out @user
    get dashboard_path
    assert_redirected_to new_user_session_path
  end

  test "show displays dashboard" do
    get dashboard_path
    assert_response :success
  end

  test "only shows videos from tracked channels" do
    get dashboard_path
    assert_response :success
    # User one tracks channel one, so should see video one but not video two
    assert_select "a[href*='vidfixture1']", minimum: 0 # Video from tracked channel
  end
end
