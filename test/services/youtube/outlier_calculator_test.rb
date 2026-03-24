require "test_helper"

class Youtube::OutlierCalculatorTest < ActiveSupport::TestCase
  setup do
    @channel = Channel.create!(youtube_channel_id: "UC123", title: "Test Channel")
  end

  test "calculates outlier scores based on average views" do
    # Create videos with known view counts
    5.times do |i|
      Video.create!(
        youtube_video_id: "vid#{i}",
        channel: @channel,
        title: "Video #{i}",
        view_count: 1000,
        published_at: i.days.ago
      )
    end
    # Create one outlier video
    Video.create!(
      youtube_video_id: "outlier",
      channel: @channel,
      title: "Outlier Video",
      view_count: 5000,
      published_at: Time.current
    )

    Youtube::OutlierCalculator.new.update_channel(@channel)

    @channel.reload
    outlier = Video.find_by(youtube_video_id: "outlier")

    # Average should be around (5*1000 + 5000) / 6 ≈ 1667
    assert outlier.outlier_score > 2.0, "Outlier video should have score > 2.0"
    assert @channel.average_view_count > 0
  end

  test "handles channel with no videos" do
    assert_nothing_raised do
      Youtube::OutlierCalculator.new.update_channel(@channel)
    end
  end
end
