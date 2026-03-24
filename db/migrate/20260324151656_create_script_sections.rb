class CreateScriptSections < ActiveRecord::Migration[8.0]
  def change
    create_table :script_sections do |t|
      t.references :project, null: false, foreign_key: true
      t.string :title
      t.text :body
      t.integer :position

      t.timestamps
    end
    add_index :script_sections, [:project_id, :position]
  end
end
