class ScriptSection < ApplicationRecord
  belongs_to :script

  validates :title, presence: true

  scope :ordered, -> { order(:position) }
end
