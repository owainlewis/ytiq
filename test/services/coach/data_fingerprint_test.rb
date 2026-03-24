require "test_helper"

class Coach::DataFingerprintTest < ActiveSupport::TestCase
  test "for_channel returns a SHA256 hex string" do
    fingerprint = Coach::DataFingerprint.for_channel(channels(:one))
    assert_match(/\A[a-f0-9]{64}\z/, fingerprint)
  end

  test "for_video returns a SHA256 hex string" do
    fingerprint = Coach::DataFingerprint.for_video(videos(:one))
    assert_match(/\A[a-f0-9]{64}\z/, fingerprint)
  end

  test "channel fingerprint changes when video is added" do
    channel = channels(:one)
    fp1 = Coach::DataFingerprint.for_channel(channel)

    channel.videos.create!(
      youtube_video_id: "new_vid_123",
      title: "New Video",
      view_count: 100,
      published_at: Time.current
    )

    fp2 = Coach::DataFingerprint.for_channel(channel)
    assert_not_equal fp1, fp2
  end
end
