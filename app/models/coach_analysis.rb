class CoachAnalysis < ApplicationRecord
  belongs_to :user
  belongs_to :analyzable, polymorphic: true

  enum :analysis_type, { channel_review: "channel_review", video_review: "video_review", plan_research: "plan_research" }
  enum :status, { pending: "pending", streaming: "streaming", completed: "completed", failed: "failed" }

  scope :recent, -> { order(created_at: :desc) }
end
