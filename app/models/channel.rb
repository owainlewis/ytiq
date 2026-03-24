class Channel < ApplicationRecord
  has_many :user_channels, dependent: :destroy
  has_many :users, through: :user_channels
  has_many :videos, dependent: :destroy
  has_many :coach_analyses, as: :analyzable, dependent: :destroy

  validates :youtube_channel_id, presence: true, uniqueness: true

  def self.upsert_from_api(data)
    find_or_initialize_by(youtube_channel_id: data.id).tap do |channel|
      channel.assign_attributes(
        title: data.snippet.title,
        description: data.snippet.description,
        thumbnail_url: data.snippet.thumbnails&.medium&.url || data.snippet.thumbnails&.default&.url,
        subscriber_count: data.statistics&.subscriber_count&.to_i,
        video_count: data.statistics&.video_count&.to_i,
        total_view_count: data.statistics&.view_count&.to_i,
        custom_url: data.snippet.custom_url,
        last_fetched_at: Time.current
      )
      channel.save!
    end
  end
end
