class Script < ApplicationRecord
  belongs_to :project
  has_many :script_sections, -> { order(:position) }, dependent: :destroy
end
