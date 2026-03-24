class Project < ApplicationRecord
  belongs_to :user
  belongs_to :channel, optional: true
  has_many :project_inspirations, -> { order(:position) }, dependent: :destroy
  has_many :inspiration_videos, through: :project_inspirations, source: :video
  has_one :script, dependent: :destroy
  has_many :coach_analyses, as: :analyzable, dependent: :destroy

  has_one_attached :thumbnail

  CHECKLIST_ITEMS = %w[title thumbnail script recorded edited published].freeze

  validates :title, presence: true

  scope :recent, -> { order(updated_at: :desc) }

  def progress
    done = CHECKLIST_ITEMS.count { |item| send(:"checklist_#{item}") }
    [ done, CHECKLIST_ITEMS.size ]
  end
end
