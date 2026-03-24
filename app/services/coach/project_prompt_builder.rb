module Coach
  class ProjectPromptBuilder
    def initialize(project, is_own_channel:)
      @project = project
      @is_own = is_own_channel
      @user = project.user
    end

    def system_prompt
      perspective = if @is_own
        "You are a YouTube growth coach helping a creator plan their next video. Use second person (\"you\", \"your\"). Be encouraging but specific."
      else
        "You are a YouTube research analyst helping plan a video. Be objective and data-driven."
      end

      <<~PROMPT
        #{perspective}

        You analyze inspiration videos and top-performing outlier titles to identify gaps, angles, and title opportunities.
        Format your response in Markdown with clear headers.
        Reference actual video titles, view counts, and outlier scores from the data provided.
        When suggesting titles, draw patterns from the real outlier titles provided — these are proven to work in this niche.

        Structure your response in exactly these three sections:
        ## Gap Analysis
        What's missing from the existing top performers? What topics, angles, or formats are underserved?

        ## Recommended Angle
        How should this video differentiate from what already exists? What unique perspective can be offered?

        ## Title Candidates
        Suggest exactly 3 title options. For each, briefly explain why it would work based on patterns in the outlier data.
        Format as:
        1. **"Title Here"** — reasoning
        2. **"Title Here"** — reasoning
        3. **"Title Here"** — reasoning
      PROMPT
    end

    def user_message
      inspirations = @project.project_inspirations.includes(video: :channel).order(:position)

      inspiration_data = inspirations.map do |insp|
        v = insp.video
        channel_info = v.channel ? "Channel: #{v.channel.title} (#{v.channel.subscriber_count} subs)" : ""
        note_info = insp.note.present? ? "Note: #{insp.note}" : ""
        "- \"#{v.title}\" | Views: #{v.view_count} | Outlier: #{v.outlier_score&.round(1)}x (#{v.outlier_label}) | #{channel_info} #{note_info}".strip
      end.join("\n")

      # Pull top outlier titles from user's tracked channels for niche context
      outlier_titles = fetch_outlier_titles

      own_channel_info = if @is_own && @project.channel
        ch = @project.channel
        "\n**Your Channel:** #{ch.title}\n**Subscribers:** #{ch.subscriber_count}\n**Average Views:** #{ch.average_view_count}\n"
      else
        ""
      end

      <<~MSG
        Help me plan this video:

        **Video Idea:** #{@project.title}
        #{own_channel_info}
        **Inspiration Videos (#{inspirations.count}):**
        #{inspiration_data}

        **Top Outlier Titles From My Niche (proven performers):**
        #{outlier_titles}

        Based on the inspiration videos and these proven outlier titles from my niche, provide:
        1. A gap analysis — what's missing from these top performers
        2. A recommended angle for this video
        3. Three title candidates with reasoning, drawing on patterns from the outlier titles
      MSG
    end

    private

    def fetch_outlier_titles
      channel_ids = @user.channel_ids
      return "No tracked channels yet." if channel_ids.empty?

      videos = Video.where(channel_id: channel_ids)
                    .where("outlier_score >= ?", 2.0)
                    .order(outlier_score: :desc)
                    .limit(20)
                    .includes(:channel)

      return "No outlier videos found yet." if videos.empty?

      videos.map do |v|
        "- \"#{v.title}\" | #{v.outlier_score&.round(1)}x | #{number_to_human(v.view_count)} views | #{v.channel.title}"
      end.join("\n")
    end

    def number_to_human(n)
      return "0" unless n
      if n >= 1_000_000
        "#{(n / 1_000_000.0).round(1)}M"
      elsif n >= 1_000
        "#{(n / 1_000.0).round(1)}K"
      else
        n.to_s
      end
    end
  end
end
