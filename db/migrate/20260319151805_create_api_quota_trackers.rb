class CreateApiQuotaTrackers < ActiveRecord::Migration[8.0]
  def change
    create_table :api_quota_trackers do |t|
      t.date :date
      t.integer :units_used, default: 0

      t.timestamps
    end
    add_index :api_quota_trackers, :date, unique: true
  end
end
