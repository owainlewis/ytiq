class RemoveShortVideos < ActiveRecord::Migration[8.0]
  def up
    # Remove videos under 5 minutes (Shorts).
    # ISO 8601 durations with no H component and minutes 0-4 are under 5 min.
    # Also catches PT##S (seconds only) patterns.
    execute <<~SQL
      DELETE FROM videos
      WHERE duration IS NOT NULL
        AND duration !~ 'H'
        AND (
          duration ~ '^PT\\d{1,2}S$'
          OR duration ~ '^PT[0-4]M'
          OR duration = 'PT0S'
          OR duration = 'P0D'
        )
    SQL
  end

  def down
    # Can't restore deleted videos
  end
end
