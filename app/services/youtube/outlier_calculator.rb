module Youtube
  class OutlierCalculator
    def update_channel(channel)
      recent_videos = channel.videos.order(published_at: :desc).limit(50)
      return if recent_videos.empty?

      avg = recent_videos.average(:view_count).to_f
      return if avg.zero?

      channel.update!(average_view_count: avg.round)

      channel.videos.where("view_count IS NOT NULL").update_all(
        Arel.sql("outlier_score = ROUND(CAST(view_count AS numeric) / #{avg}, 2)")
      )
    end
  end
end
