require "test_helper"

class UserChannelTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(email: "test@example.com", password: "password123")
    @channel = Channel.create!(youtube_channel_id: "UC123", title: "Test Channel")
  end

  test "user can follow a channel" do
    uc = UserChannel.create!(user: @user, channel: @channel)
    assert uc.persisted?
  end

  test "prevents duplicate follows" do
    UserChannel.create!(user: @user, channel: @channel)
    duplicate = UserChannel.new(user: @user, channel: @channel)
    assert_not duplicate.valid?
  end
end
