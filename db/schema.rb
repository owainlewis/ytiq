# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_03_24_151935) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "api_quota_trackers", force: :cascade do |t|
    t.date "date"
    t.integer "units_used", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["date"], name: "index_api_quota_trackers_on_date", unique: true
  end

  create_table "channels", force: :cascade do |t|
    t.string "youtube_channel_id"
    t.string "title"
    t.text "description"
    t.string "thumbnail_url"
    t.bigint "subscriber_count"
    t.integer "video_count"
    t.bigint "total_view_count"
    t.string "custom_url"
    t.bigint "average_view_count"
    t.datetime "last_fetched_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["youtube_channel_id"], name: "index_channels_on_youtube_channel_id", unique: true
  end

  create_table "coach_analyses", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "analyzable_type", null: false
    t.bigint "analyzable_id", null: false
    t.string "analysis_type", null: false
    t.text "prompt_snapshot"
    t.text "response_markdown", default: ""
    t.string "status", default: "pending"
    t.string "data_fingerprint"
    t.integer "prompt_tokens"
    t.integer "completion_tokens"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["analyzable_type", "analyzable_id", "user_id", "analysis_type"], name: "idx_coach_analyses_lookup"
    t.index ["analyzable_type", "analyzable_id"], name: "index_coach_analyses_on_analyzable"
    t.index ["user_id"], name: "index_coach_analyses_on_user_id"
  end

  create_table "project_inspirations", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.bigint "video_id", null: false
    t.text "note"
    t.integer "position"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "video_id"], name: "index_project_inspirations_on_project_id_and_video_id", unique: true
    t.index ["project_id"], name: "index_project_inspirations_on_project_id"
    t.index ["video_id"], name: "index_project_inspirations_on_video_id"
  end

  create_table "projects", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "channel_id"
    t.string "title", null: false
    t.text "gap_analysis"
    t.text "angle"
    t.string "title_candidate_1"
    t.string "title_candidate_2"
    t.string "title_candidate_3"
    t.string "chosen_title"
    t.text "reflections"
    t.boolean "checklist_title", default: false, null: false
    t.boolean "checklist_thumbnail", default: false, null: false
    t.boolean "checklist_script", default: false, null: false
    t.boolean "checklist_recorded", default: false, null: false
    t.boolean "checklist_edited", default: false, null: false
    t.boolean "checklist_published", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "script_hook"
    t.text "script_cta"
    t.index ["channel_id"], name: "index_projects_on_channel_id"
    t.index ["user_id"], name: "index_projects_on_user_id"
  end

  create_table "script_sections", force: :cascade do |t|
    t.string "title"
    t.text "body"
    t.integer "position"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "script_id"
    t.index ["script_id"], name: "index_script_sections_on_script_id"
  end

  create_table "scripts", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.text "hook"
    t.text "cta"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_scripts_on_project_id"
  end

  create_table "user_channels", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "channel_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["channel_id"], name: "index_user_channels_on_channel_id"
    t.index ["user_id", "channel_id"], name: "index_user_channels_on_user_id_and_channel_id", unique: true
    t.index ["user_id"], name: "index_user_channels_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "provider"
    t.string "uid"
    t.string "name"
    t.string "avatar_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "own_channel_id"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["own_channel_id"], name: "index_users_on_own_channel_id"
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "videos", force: :cascade do |t|
    t.bigint "channel_id", null: false
    t.string "youtube_video_id"
    t.string "title"
    t.text "description"
    t.string "thumbnail_url"
    t.datetime "published_at"
    t.bigint "view_count"
    t.bigint "like_count"
    t.bigint "comment_count"
    t.string "duration"
    t.float "outlier_score"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["channel_id", "published_at"], name: "index_videos_on_channel_id_and_published_at"
    t.index ["channel_id"], name: "index_videos_on_channel_id"
    t.index ["outlier_score"], name: "index_videos_on_outlier_score"
    t.index ["published_at"], name: "index_videos_on_published_at"
    t.index ["view_count"], name: "index_videos_on_view_count"
    t.index ["youtube_video_id"], name: "index_videos_on_youtube_video_id", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "coach_analyses", "users"
  add_foreign_key "project_inspirations", "projects", on_delete: :cascade
  add_foreign_key "project_inspirations", "videos", on_delete: :cascade
  add_foreign_key "projects", "channels"
  add_foreign_key "projects", "users"
  add_foreign_key "script_sections", "scripts"
  add_foreign_key "scripts", "projects"
  add_foreign_key "user_channels", "channels"
  add_foreign_key "user_channels", "users"
  add_foreign_key "users", "channels", column: "own_channel_id", on_delete: :nullify
  add_foreign_key "videos", "channels"
end
