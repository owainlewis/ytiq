require "test_helper"

class CoachAnalysisTest < ActiveSupport::TestCase
  test "valid with correct attributes" do
    analysis = CoachAnalysis.new(
      user: users(:one),
      analyzable: channels(:one),
      analysis_type: "channel_review",
      status: "pending"
    )
    assert analysis.valid?
  end

  test "invalid with bad analysis_type" do
    assert_raises(ArgumentError) do
      CoachAnalysis.new(
        user: users(:one),
        analyzable: channels(:one),
        analysis_type: "bad_type",
        status: "pending"
      )
    end
  end

  test "invalid with bad status" do
    assert_raises(ArgumentError) do
      CoachAnalysis.new(
        user: users(:one),
        analyzable: channels(:one),
        analysis_type: "channel_review",
        status: "unknown"
      )
    end
  end

  test "belongs to user" do
    assert_respond_to CoachAnalysis.new, :user
  end

  test "belongs to analyzable" do
    assert_respond_to CoachAnalysis.new, :analyzable
  end
end
