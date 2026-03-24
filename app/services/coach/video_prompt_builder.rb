module Coach
  class VideoPromptBuilder
    def initialize(video, is_own_channel:)
      @video = video
      @channel = video.channel
      @is_own = is_own_channel
    end

    def system_prompt
      perspective = if @is_own
        "You are a YouTube growth coach speaking directly to the video creator. Use second person (\"you\", \"your\"). Be encouraging but honest."
      else
        "You are a YouTube analyst reviewing a specific video. Use third person (\"this creator\", \"they\"). Be objective and analytical."
      end

      <<~PROMPT
        #{perspective}

        You analyze individual YouTube video performance and provide specific, actionable feedback.
        Format your response in Markdown with clear headers and bullet points.
        Compare the video against its siblings from the same channel.
        Be specific — reference actual numbers and titles.
      PROMPT
    end

    def user_message
      siblings = @channel.videos
        .where.not(id: @video.id)
        .order(published_at: :desc)
        .limit(10)

      sibling_data = siblings.map do |v|
        "- \"#{v.title}\" | Views: #{v.view_count} | Outlier: #{v.outlier_score&.round(1)}x"
      end.join("\n")

      outlier_label = @video.outlier_label

      <<~MSG
        Analyze this specific video's performance:

        **Video:** "#{@video.title}"
        **Channel:** #{@channel.title} (Avg views/video: #{@channel.average_view_count})
        **Views:** #{@video.view_count}
        **Likes:** #{@video.like_count}
        **Comments:** #{@video.comment_count}
        **Published:** #{@video.published_at&.strftime('%Y-%m-%d')}
        **Outlier Score:** #{@video.outlier_score&.round(1)}x (#{outlier_label})

        **Recent Sibling Videos for Comparison:**
        #{sibling_data}

        Please analyze:
        1. **Performance Verdict** — How did this video perform relative to the channel average and siblings?
        2. **What Worked** — What likely contributed to the performance (title, topic, timing)?
        3. **What Didn't Work** — What may have held it back?
        4. **Title Alternatives** — Suggest 3 alternative titles that might have performed better
        5. **Replication Advice** — How to replicate successes or avoid the same mistakes
      MSG
    end

  end
end
