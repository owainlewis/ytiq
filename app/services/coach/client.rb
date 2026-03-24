module Coach
  class Client
    MODEL = "claude-sonnet-4-20250514"
    MAX_TOKENS = 4096

    def initialize
      @client = Anthropic::Client.new(access_token: ENV.fetch("ANTHROPIC_API_KEY"))
    end

    def stream(system_prompt:, user_message:, &block)
      input_tokens = 0
      output_tokens = 0

      @client.messages(
        parameters: {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: system_prompt,
          messages: [ { role: "user", content: user_message } ],
          stream: proc { |event|
            case event["type"]
            when "content_block_delta"
              text = event.dig("delta", "text")
              block.call(text) if text
            when "message_delta"
              output_tokens = event.dig("usage", "output_tokens") || 0
            when "message_start"
              input_tokens = event.dig("message", "usage", "input_tokens") || 0
            end
          }
        }
      )

      { prompt_tokens: input_tokens, completion_tokens: output_tokens }
    end
  end
end
