class ApiQuotaTracker < ApplicationRecord
  validates :date, presence: true, uniqueness: true
end
