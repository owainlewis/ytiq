class AddOwnChannelIdToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :own_channel_id, :bigint
    add_foreign_key :users, :channels, column: :own_channel_id, on_delete: :nullify
    add_index :users, :own_channel_id
  end
end
