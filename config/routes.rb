Rails.application.routes.draw do
  devise_for :users, controllers: { omniauth_callbacks: "users/omniauth_callbacks" }

  root "pages#home"

  get "dashboard", to: "dashboard#show"

  resources :channels, only: [:index, :show, :create, :destroy]

  get "search", to: "search#show"

  resources :videos, only: [:index]

  resource :settings, only: [:show, :update]

  resources :coach_analyses, only: [:index, :show, :create]

  resources :projects do
    member do
      post :generate_analysis
    end
    resources :inspirations, only: [:create, :destroy],
              controller: "project_inspirations"
  end

  resources :channels, only: [] do
    post :coach, on: :member, to: "coach_analyses#create",
         defaults: { analysis_type: "channel_review" }
  end
  resources :videos, only: [] do
    post :coach, on: :member, to: "coach_analyses#create",
         defaults: { analysis_type: "video_review" }
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
