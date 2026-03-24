class CoachAnalysisJob < ApplicationJob
  queue_as :default

  def perform(coach_analysis_id)
    analysis = CoachAnalysis.find(coach_analysis_id)
    Coach::Analyzer.new(analysis).call
  end
end
