module Coach
  class ChannelPromptBuilder
    def initialize(channel, is_own_channel:)
      @channel = channel
      @is_own = is_own_channel
    end

    def system_prompt
      perspective = if @is_own
        "You are a YouTube growth coach speaking directly to the channel owner. Use second person (\"you\", \"your\"). Be encouraging but honest."
      else
        "You are a YouTube analyst reviewing a channel. Use third person (\"this channel\", \"they\"). Be objective and analytical."
      end

      <<~PROMPT
        #{perspective}

        You analyze YouTube channel performance data and provide specific, actionable coaching.
        Format your response in Markdown with clear headers and bullet points.
        Reference actual video titles, view counts, and outlier scores from the data provided.
        Be specific — don't give generic YouTube advice. Ground every recommendation in the data.
      PROMPT
    end

    def user_message
      videos = @channel.videos.order(published_at: :desc).limit(50)

      video_data = videos.map do |v|
        outlier_label = v.outlier_label
        "- \"#{v.title}\" | Views: #{v.view_count} | Likes: #{v.like_count} | Comments: #{v.comment_count} | Published: #{v.published_at&.strftime('%Y-%m-%d')} | Outlier: #{v.outlier_score&.round(1)}x (#{outlier_label})"
      end.join("\n")

      <<~MSG
        Analyze this YouTube channel and provide coaching:

        **Channel:** #{@channel.title}
        **Subscribers:** #{@channel.subscriber_count}
        **Total Views:** #{@channel.total_view_count}
        **Average Views/Video:** #{@channel.average_view_count}
        **Total Videos Tracked:** #{videos.size}

        **Recent Videos (up to 50):**
        #{video_data}

        Please analyze:
        1. **Posting Cadence** — How often do they post? Is it consistent?
        2. **Top Performers** — Which videos significantly outperformed? Why?
        3. **Underperformers** — Which videos underperformed? What went wrong?
        4. **Title Patterns** — What title styles work best?
        5. **Growth Recommendations** — 3-5 specific, actionable recommendations based on the data
      MSG
    end
  end
end
