require "test_helper"

class VideoTest < ActiveSupport::TestCase
  setup do
    @channel = Channel.create!(youtube_channel_id: "UC123", title: "Test Channel")
  end

  test "requires youtube_video_id" do
    video = Video.new(channel: @channel, title: "Test")
    assert_not video.valid?
    assert_includes video.errors[:youtube_video_id], "can't be blank"
  end

  test "youtube_video_id must be unique" do
    Video.create!(youtube_video_id: "vid123", channel: @channel, title: "Test")
    duplicate = Video.new(youtube_video_id: "vid123", channel: @channel, title: "Test 2")
    assert_not duplicate.valid?
  end

  test "belongs to channel" do
    video = Video.new(youtube_video_id: "vid123", title: "Test")
    assert_not video.valid?
  end
end
