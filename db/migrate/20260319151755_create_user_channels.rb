class CreateUserChannels < ActiveRecord::Migration[8.0]
  def change
    create_table :user_channels do |t|
      t.references :user, null: false, foreign_key: true
      t.references :channel, null: false, foreign_key: true

      t.timestamps
    end
    add_index :user_channels, [ :user_id, :channel_id ], unique: true
  end
end
