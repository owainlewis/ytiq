class AddMissingIndexes < ActiveRecord::Migration[8.0]
  def change
    add_index :videos, [ :channel_id, :published_at ], name: "index_videos_on_channel_id_and_published_at"
    add_index :videos, :view_count, name: "index_videos_on_view_count"
    add_index :users, [ :provider, :uid ], unique: true, name: "index_users_on_provider_and_uid"
  end
end
