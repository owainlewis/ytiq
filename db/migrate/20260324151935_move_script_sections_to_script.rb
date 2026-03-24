class MoveScriptSectionsToScript < ActiveRecord::Migration[8.0]
  def change
    add_reference :script_sections, :script, null: true, foreign_key: true
    remove_reference :script_sections, :project, foreign_key: true
  end
end
