class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [ :google_oauth2 ]

  has_many :user_channels, dependent: :destroy
  has_many :channels, through: :user_channels
  has_many :coach_analyses, dependent: :destroy
  has_many :projects, dependent: :destroy

  belongs_to :own_channel, class_name: "Channel", optional: true

  def display_avatar_url
    avatar_url.presence || own_channel&.thumbnail_url
  end

  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.password = Devise.friendly_token[0, 20]
      user.name = auth.info.name
      user.avatar_url = auth.info.image
    end
  end
end
