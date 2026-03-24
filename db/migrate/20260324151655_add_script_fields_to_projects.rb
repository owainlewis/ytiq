class AddScriptFieldsToProjects < ActiveRecord::Migration[8.0]
  def change
    add_column :projects, :script_hook, :text
    add_column :projects, :script_cta, :text
  end
end
