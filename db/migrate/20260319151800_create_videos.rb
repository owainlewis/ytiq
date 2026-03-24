class CreateVideos < ActiveRecord::Migration[8.0]
  def change
    create_table :videos do |t|
      t.references :channel, null: false, foreign_key: true
      t.string :youtube_video_id
      t.string :title
      t.text :description
      t.string :thumbnail_url
      t.datetime :published_at
      t.bigint :view_count
      t.bigint :like_count
      t.bigint :comment_count
      t.string :duration
      t.float :outlier_score

      t.timestamps
    end
    add_index :videos, :youtube_video_id, unique: true
    add_index :videos, :published_at
    add_index :videos, :outlier_score
  end
end
