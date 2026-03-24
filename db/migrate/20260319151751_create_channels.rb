class CreateChannels < ActiveRecord::Migration[8.0]
  def change
    create_table :channels do |t|
      t.string :youtube_channel_id
      t.string :title
      t.text :description
      t.string :thumbnail_url
      t.bigint :subscriber_count
      t.integer :video_count
      t.bigint :total_view_count
      t.string :custom_url
      t.bigint :average_view_count
      t.datetime :last_fetched_at

      t.timestamps
    end
    add_index :channels, :youtube_channel_id, unique: true
  end
end
