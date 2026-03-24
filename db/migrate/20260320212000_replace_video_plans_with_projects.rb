class ReplaceVideoPlansWithProjects < ActiveRecord::Migration[8.0]
  def change
    drop_table :video_plan_inspirations, if_exists: true
    drop_table :video_plans, if_exists: true

    create_table :projects do |t|
      t.references :user, null: false, foreign_key: true
      t.references :channel, foreign_key: true
      t.string :title, null: false
      t.text :gap_analysis
      t.text :angle
      t.string :title_candidate_1
      t.string :title_candidate_2
      t.string :title_candidate_3
      t.string :chosen_title
      t.text :reflections
      t.boolean :checklist_title, default: false, null: false
      t.boolean :checklist_thumbnail, default: false, null: false
      t.boolean :checklist_script, default: false, null: false
      t.boolean :checklist_recorded, default: false, null: false
      t.boolean :checklist_edited, default: false, null: false
      t.boolean :checklist_published, default: false, null: false
      t.timestamps
    end

    create_table :project_inspirations do |t|
      t.references :project, null: false, foreign_key: { on_delete: :cascade }
      t.references :video, null: false, foreign_key: { on_delete: :cascade }
      t.text :note
      t.integer :position
      t.timestamps
    end

    add_index :project_inspirations, [:project_id, :video_id], unique: true
  end
end
