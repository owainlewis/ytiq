require "test_helper"

class ChannelTest < ActiveSupport::TestCase
  test "requires youtube_channel_id" do
    channel = Channel.new(title: "Test")
    assert_not channel.valid?
    assert_includes channel.errors[:youtube_channel_id], "can't be blank"
  end

  test "youtube_channel_id must be unique" do
    Channel.create!(youtube_channel_id: "UC123", title: "Test")
    duplicate = Channel.new(youtube_channel_id: "UC123", title: "Test 2")
    assert_not duplicate.valid?
  end

  test "has many videos" do
    channel = Channel.create!(youtube_channel_id: "UC123", title: "Test")
    assert_respond_to channel, :videos
  end

  test "has many users through user_channels" do
    channel = Channel.create!(youtube_channel_id: "UC123", title: "Test")
    assert_respond_to channel, :users
  end
end
