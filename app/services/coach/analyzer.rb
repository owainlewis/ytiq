module Coach
  class Analyzer
    def initialize(coach_analysis)
      @analysis = coach_analysis
      @user = coach_analysis.user
      @analyzable = coach_analysis.analyzable
    end

    def call
      fingerprint = compute_fingerprint
      cached = find_cached(fingerprint)

      if cached
        @analysis.update!(
          status: "completed",
          response_markdown: cached.response_markdown,
          data_fingerprint: fingerprint,
          prompt_tokens: cached.prompt_tokens,
          completion_tokens: cached.completion_tokens,
          prompt_snapshot: cached.prompt_snapshot
        )
        broadcast_response
        broadcast_status
        return
      end

      builder = build_prompt
      system_prompt = builder.system_prompt
      user_message = builder.user_message

      @analysis.update!(
        status: "streaming",
        data_fingerprint: fingerprint,
        prompt_snapshot: "System: #{system_prompt}\n\nUser: #{user_message}"
      )
      broadcast_status

      full_response = +""
      client = Coach::Client.new
      last_db_write = Time.current

      token_usage = client.stream(
        system_prompt: system_prompt,
        user_message: user_message
      ) do |text_delta|
        full_response << text_delta
        broadcast_response_text(full_response)
        if Time.current - last_db_write >= 0.5
          @analysis.update_column(:response_markdown, full_response)
          last_db_write = Time.current
        end
      end

      @analysis.update!(
        status: "completed",
        response_markdown: full_response,
        prompt_tokens: token_usage[:prompt_tokens],
        completion_tokens: token_usage[:completion_tokens]
      )
      broadcast_status
    rescue => e
      @analysis.update!(status: "failed", response_markdown: "Analysis failed: #{e.message}")
      broadcast_response
      broadcast_status
      Rails.logger.error("Coach::Analyzer failed: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    end

    private

    def compute_fingerprint
      case @analyzable
      when Channel
        Coach::DataFingerprint.for_channel(@analyzable)
      when Video
        Coach::DataFingerprint.for_video(@analyzable)
      when Project
        Coach::DataFingerprint.for_project(@analyzable)
      end
    end

    def find_cached(fingerprint)
      CoachAnalysis.where(
        user: @user,
        analyzable: @analyzable,
        analysis_type: @analysis.analysis_type,
        data_fingerprint: fingerprint,
        status: "completed"
      ).where.not(id: @analysis.id).order(created_at: :desc).first
    end

    def build_prompt
      is_own = @user.own_channel_id.present? && owns_channel?

      case @analysis.analysis_type
      when "channel_review"
        Coach::ChannelPromptBuilder.new(@analyzable, is_own_channel: is_own)
      when "video_review"
        Coach::VideoPromptBuilder.new(@analyzable, is_own_channel: is_own)
      when "plan_research"
        Coach::ProjectPromptBuilder.new(@analyzable, is_own_channel: is_own)
      end
    end

    def owns_channel?
      case @analyzable
      when Channel
        @analyzable.id == @user.own_channel_id
      when Video
        @analyzable.channel_id == @user.own_channel_id
      when Project
        @analyzable.channel_id == @user.own_channel_id
      else
        false
      end
    end

    def broadcast_update(target, partial)
      Turbo::StreamsChannel.broadcast_replace_to(
        "coach_analysis_#{@analysis.id}",
        target: target,
        partial: "coach_analyses/#{partial}",
        locals: { analysis: @analysis }
      )
    end

    def broadcast_response
      broadcast_update("coach_response", "response")
    end

    def broadcast_response_text(text)
      @analysis.response_markdown = text
      broadcast_response
    end

    def broadcast_status
      broadcast_update("coach_status", "status")
    end
  end
end
