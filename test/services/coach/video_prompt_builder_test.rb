require "test_helper"

class Coach::VideoPromptBuilderTest < ActiveSupport::TestCase
  test "own channel uses second person" do
    builder = Coach::VideoPromptBuilder.new(videos(:one), is_own_channel: true)
    assert_match(/you/i, builder.system_prompt)
  end

  test "other channel uses third person" do
    builder = Coach::VideoPromptBuilder.new(videos(:one), is_own_channel: false)
    assert_match(/third person/i, builder.system_prompt)
  end

  test "user message includes video title" do
    builder = Coach::VideoPromptBuilder.new(videos(:one), is_own_channel: false)
    assert_includes builder.user_message, videos(:one).title
  end

  test "user message includes channel average" do
    builder = Coach::VideoPromptBuilder.new(videos(:one), is_own_channel: false)
    assert_includes builder.user_message, channels(:one).average_view_count.to_s
  end
end
