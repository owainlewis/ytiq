require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "home is accessible without login" do
    get root_path
    assert_response :success
  end

  test "home redirects to dashboard when signed in" do
    sign_in users(:one)
    get root_path
    assert_redirected_to dashboard_path
  end
end
