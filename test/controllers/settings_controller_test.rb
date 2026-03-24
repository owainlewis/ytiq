require "test_helper"

class SettingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    sign_in @user
  end

  test "requires authentication" do
    sign_out @user
    get settings_path
    assert_redirected_to new_user_session_path
  end

  test "show renders settings page" do
    get settings_path
    assert_response :success
  end

  test "update with blank query redirects with alert" do
    patch settings_path, params: { channel_query: "" }
    assert_redirected_to settings_path
    assert_equal "Please enter a channel URL or handle.", flash[:alert]
  end

  test "update removes channel when own_channel_id is blank" do
    @user.update!(own_channel: channels(:one))
    patch settings_path, params: { user: { own_channel_id: "" } }
    assert_redirected_to settings_path
    assert_nil @user.reload.own_channel_id
  end

  test "update sets own channel when found" do
    channel = channels(:one)
    Youtube::ChannelFetcher.any_instance.stubs(:fetch).returns(channel)

    patch settings_path, params: { channel_query: "@mychannel" }
    assert_redirected_to settings_path
    assert_equal channel.id, @user.reload.own_channel_id
  end

  test "update when channel not found redirects with alert" do
    Youtube::ChannelFetcher.any_instance.stubs(:fetch).returns(nil)

    patch settings_path, params: { channel_query: "@nonexistent" }
    assert_redirected_to settings_path
    assert_equal "Could not find that channel.", flash[:alert]
  end

  test "update handles quota exceeded" do
    Youtube::Client
    Youtube::ChannelFetcher.any_instance.stubs(:fetch).raises(Youtube::QuotaExceededError.new("quota exceeded"))

    patch settings_path, params: { channel_query: "@somechannel" }
    assert_redirected_to settings_path
    assert_match "quota exceeded", flash[:alert]
  end
end
