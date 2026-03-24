module Youtube
  class ChannelFetcher
    def initialize(client = Youtube::Client.new)
      @client = client
    end

    def fetch(input)
      parsed = Youtube::UrlParser.parse(input)

      channel_data = case parsed[:type]
      when :channel_id
        @client.channels_by_id(parsed[:value])&.items&.first
      when :handle
        @client.channels_by_handle(parsed[:value])&.items&.first
      when :custom, :search
        results = @client.search_channels(parsed[:value], max_results: 1)
        return nil if results.items.empty?
        channel_id = results.items.first.snippet.channel_id
        @client.channels_by_id(channel_id)&.items&.first
      end

      return nil unless channel_data

      upsert_channel(channel_data)
    end

    private

    def upsert_channel(data)
      Channel.upsert_from_api(data)
    end
  end
end
