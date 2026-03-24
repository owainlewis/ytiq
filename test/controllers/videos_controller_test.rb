require "test_helper"

class VideosControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    sign_in @user
  end

  test "requires authentication" do
    sign_out @user
    get videos_path
    assert_redirected_to new_user_session_path
  end

  test "index returns success" do
    get videos_path
    assert_response :success
  end

  test "index filters by min_outlier" do
    get videos_path, params: { min_outlier: "2.0" }
    assert_response :success
  end

  test "index filters by min_views" do
    get videos_path, params: { min_views: "5000" }
    assert_response :success
  end

  test "index rejects invalid sort columns" do
    get videos_path, params: { sort: "drop table", direction: "asc" }
    assert_response :success
  end

  test "index rejects invalid direction" do
    get videos_path, params: { sort: "view_count", direction: "sideways" }
    assert_response :success
  end
end
