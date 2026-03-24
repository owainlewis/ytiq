class CreateScripts < ActiveRecord::Migration[8.0]
  def change
    create_table :scripts do |t|
      t.references :project, null: false, foreign_key: true
      t.text :hook
      t.text :cta

      t.timestamps
    end
  end
end
