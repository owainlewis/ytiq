module Youtube
  class UrlParser
    PATTERNS = [
      # https://www.youtube.com/watch?v=VIDEO_ID
      %r{youtube\.com/watch\?v=(?<video_id>[\w-]+)},
      # https://youtu.be/VIDEO_ID
      %r{youtu\.be/(?<video_id>[\w-]+)},
      # https://www.youtube.com/shorts/VIDEO_ID
      %r{youtube\.com/shorts/(?<video_id>[\w-]+)},
      # https://www.youtube.com/channel/UC...
      %r{youtube\.com/channel/(?<id>UC[\w-]+)},
      # https://www.youtube.com/@handle
      %r{youtube\.com/@(?<handle>[\w.-]+)},
      # https://www.youtube.com/c/ChannelName or /user/Username
      %r{youtube\.com/(?:c|user)/(?<custom>[\w.-]+)}
    ].freeze

    def self.parse(input)
      input = input.strip

      PATTERNS.each do |pattern|
        match = input.match(pattern)
        next unless match

        if match.names.include?("video_id")
          return { type: :video_id, value: match[:video_id] }
        elsif match.names.include?("id")
          return { type: :channel_id, value: match[:id] }
        elsif match.names.include?("handle")
          return { type: :handle, value: match[:handle] }
        elsif match.names.include?("custom")
          return { type: :custom, value: match[:custom] }
        end
      end

      # If starts with @, treat as handle
      if input.start_with?("@")
        return { type: :handle, value: input.delete_prefix("@") }
      end

      # If starts with UC and looks like channel ID
      if input.match?(/\AUC[\w-]{22,}\z/)
        return { type: :channel_id, value: input }
      end

      # Otherwise treat as search query
      { type: :search, value: input }
    end
  end
end
