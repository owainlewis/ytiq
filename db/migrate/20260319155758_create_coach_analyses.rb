class CreateCoachAnalyses < ActiveRecord::Migration[8.0]
  def change
    create_table :coach_analyses do |t|
      t.references :user, null: false, foreign_key: true
      t.references :analyzable, polymorphic: true, null: false
      t.string :analysis_type, null: false
      t.text :prompt_snapshot
      t.text :response_markdown, default: ""
      t.string :status, default: "pending"
      t.string :data_fingerprint
      t.integer :prompt_tokens
      t.integer :completion_tokens
      t.timestamps
    end

    add_index :coach_analyses,
              [:analyzable_type, :analyzable_id, :user_id, :analysis_type],
              name: "idx_coach_analyses_lookup"
  end
end
