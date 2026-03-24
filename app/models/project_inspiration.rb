class ProjectInspiration < ApplicationRecord
  belongs_to :project
  belongs_to :video

  validates :video_id, uniqueness: { scope: :project_id }
end
