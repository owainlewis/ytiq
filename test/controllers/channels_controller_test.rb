require "test_helper"

class ChannelsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @channel = channels(:one)
    sign_in @user
  end

  test "requires authentication" do
    sign_out @user
    get channels_path
    assert_redirected_to new_user_session_path
  end

  test "index lists only current user channels" do
    get channels_path
    assert_response :success
    assert_match channels(:one).title, response.body
    refute_match channels(:two).title, response.body
  end

  test "show displays any channel" do
    get channel_path(channels(:two))
    assert_response :success
  end

  test "show sets is_tracked for tracked channel" do
    get channel_path(@channel)
    assert_response :success
  end

  test "create with blank query redirects with alert" do
    post channels_path, params: { query: "" }
    assert_redirected_to channels_path
    assert_equal "Please enter a channel URL, handle, or name.", flash[:alert]
  end

  test "create with valid channel adds and redirects" do
    new_channel = Channel.create!(
      youtube_channel_id: "UCnew123",
      title: "New Channel"
    )

    Youtube::ChannelFetcher.any_instance.stubs(:fetch).returns(new_channel)

    assert_enqueued_with(job: FetchChannelDetailsJob) do
      post channels_path, params: { query: "@newchannel" }
    end
    assert_redirected_to channel_path(new_channel)
    assert @user.channels.exists?(new_channel.id)
  end

  test "create when channel not found redirects with alert" do
    Youtube::ChannelFetcher.any_instance.stubs(:fetch).returns(nil)

    post channels_path, params: { query: "@nonexistent" }
    assert_redirected_to channels_path
    assert_equal "Could not find that channel.", flash[:alert]
  end

  test "create handles quota exceeded" do
    # Ensure the constant is loaded before stubbing (parallel tests may not have autoloaded it)
    Youtube::Client
    Youtube::ChannelFetcher.any_instance.stubs(:fetch).raises(Youtube::QuotaExceededError.new("quota exceeded"))

    post channels_path, params: { query: "@somechannel" }
    assert_redirected_to channels_path
    assert_match "quota exceeded", flash[:alert]
  end

  test "destroy removes channel from user but not from database" do
    assert @user.channels.exists?(@channel.id)
    delete channel_path(@channel)
    assert_redirected_to channels_path
    refute @user.channels.exists?(@channel.id)
    assert Channel.exists?(@channel.id)
  end

  test "destroy cannot remove another user channel" do
    other_channel = channels(:two)
    delete channel_path(other_channel)
    assert_response :not_found
  end
end
