require "test_helper"

class ApiQuotaTrackerTest < ActiveSupport::TestCase
  test "requires date" do
    tracker = ApiQuotaTracker.new(units_used: 0)
    assert_not tracker.valid?
  end

  test "date must be unique" do
    ApiQuotaTracker.create!(date: Date.new(2099, 1, 1), units_used: 0)
    duplicate = ApiQuotaTracker.new(date: Date.new(2099, 1, 1), units_used: 0)
    assert_not duplicate.valid?
  end

  test "defaults units_used to 0" do
    tracker = ApiQuotaTracker.create!(date: Date.new(2099, 1, 2))
    assert_equal 0, tracker.units_used
  end
end
