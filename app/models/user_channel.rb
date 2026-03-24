class UserChannel < ApplicationRecord
  belongs_to :user
  belongs_to :channel

  validates :user_id, uniqueness: { scope: :channel_id }
end
