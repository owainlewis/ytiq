require "test_helper"

class Youtube::UrlParserTest < ActiveSupport::TestCase
  test "parses channel URL" do
    result = Youtube::UrlParser.parse("https://www.youtube.com/channel/UCddiUEpeqJcYeBxX1IVBKvQ")
    assert_equal :channel_id, result[:type]
    assert_equal "UCddiUEpeqJcYeBxX1IVBKvQ", result[:value]
  end

  test "parses handle URL" do
    result = Youtube::UrlParser.parse("https://www.youtube.com/@mkbhd")
    assert_equal :handle, result[:type]
    assert_equal "mkbhd", result[:value]
  end

  test "parses bare handle" do
    result = Youtube::UrlParser.parse("@mkbhd")
    assert_equal :handle, result[:type]
    assert_equal "mkbhd", result[:value]
  end

  test "parses custom URL" do
    result = Youtube::UrlParser.parse("https://www.youtube.com/c/MrBeast")
    assert_equal :custom, result[:type]
    assert_equal "MrBeast", result[:value]
  end

  test "parses user URL" do
    result = Youtube::UrlParser.parse("https://www.youtube.com/user/LinusTechTips")
    assert_equal :custom, result[:type]
    assert_equal "LinusTechTips", result[:value]
  end

  test "parses bare channel ID" do
    result = Youtube::UrlParser.parse("UCddiUEpeqJcYeBxX1IVBKvQ")
    assert_equal :channel_id, result[:type]
  end

  test "falls back to search for plain text" do
    result = Youtube::UrlParser.parse("MrBeast")
    assert_equal :search, result[:type]
    assert_equal "MrBeast", result[:value]
  end

  test "strips whitespace" do
    result = Youtube::UrlParser.parse("  @mkbhd  ")
    assert_equal :handle, result[:type]
    assert_equal "mkbhd", result[:value]
  end
end
