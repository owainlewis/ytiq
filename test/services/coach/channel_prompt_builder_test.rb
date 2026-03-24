require "test_helper"

class Coach::ChannelPromptBuilderTest < ActiveSupport::TestCase
  test "own channel uses second person" do
    builder = Coach::ChannelPromptBuilder.new(channels(:one), is_own_channel: true)
    assert_match(/you/i, builder.system_prompt)
    assert_match(/second person/i, builder.system_prompt)
  end

  test "other channel uses third person" do
    builder = Coach::ChannelPromptBuilder.new(channels(:one), is_own_channel: false)
    assert_match(/third person/i, builder.system_prompt)
  end

  test "user message includes channel title" do
    builder = Coach::ChannelPromptBuilder.new(channels(:one), is_own_channel: false)
    assert_includes builder.user_message, channels(:one).title
  end

  test "user message includes video titles" do
    builder = Coach::ChannelPromptBuilder.new(channels(:one), is_own_channel: false)
    message = builder.user_message
    channels(:one).videos.each do |video|
      assert_includes message, video.title
    end
  end
end
