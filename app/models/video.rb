class Video < ApplicationRecord
  belongs_to :channel
  has_many :coach_analyses, as: :analyzable, dependent: :destroy
  has_many :project_inspirations, dependent: :destroy

  validates :youtube_video_id, presence: true, uniqueness: true

  OUTLIER_THRESHOLDS = [
    [ 5, "viral outlier" ],
    [ 3, "strong outlier" ],
    [ 2, "above average" ],
    [ 1, "average" ]
  ].freeze

  def self.upsert_from_api(channel, data)
    duration_str = data.content_details&.duration
    return nil if short_duration?(duration_str)

    find_or_initialize_by(youtube_video_id: data.id).tap do |video|
      video.assign_attributes(
        channel: channel,
        title: data.snippet.title,
        description: data.snippet.description,
        thumbnail_url: data.snippet.thumbnails&.high&.url || data.snippet.thumbnails&.default&.url,
        published_at: data.snippet.published_at,
        view_count: data.statistics&.view_count&.to_i,
        like_count: data.statistics&.like_count&.to_i,
        comment_count: data.statistics&.comment_count&.to_i,
        duration: duration_str
      )
      video.save!
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.warn "Failed to save video #{data.id}: #{e.message}"
    nil
  end

  def self.parse_duration(iso_duration)
    return 0 if iso_duration.blank?
    match = iso_duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    return 0 unless match
    (match[1].to_i * 3600) + (match[2].to_i * 60) + match[3].to_i
  end

  def self.short_duration?(iso_duration)
    seconds = parse_duration(iso_duration)
    seconds > 0 && seconds < 300
  end

  def duration_seconds
    self.class.parse_duration(duration)
  end

  def short?
    self.class.short_duration?(duration)
  end

  def outlier_label
    return "no data" unless outlier_score
    OUTLIER_THRESHOLDS.each do |threshold, label|
      return label if outlier_score >= threshold
    end
    "below average"
  end
end
