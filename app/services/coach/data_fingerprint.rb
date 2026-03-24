module Coach
  class DataFingerprint
    def self.for_channel(channel)
      data = "#{channel.updated_at}|#{channel.videos.maximum(:updated_at)}|#{channel.videos.count}"
      Digest::SHA256.hexdigest(data)
    end

    def self.for_video(video)
      Digest::SHA256.hexdigest(video.updated_at.to_s)
    end

    def self.for_project(project)
      data = "#{project.updated_at}|#{project.project_inspirations.maximum(:updated_at)}|#{project.project_inspirations.count}"
      Digest::SHA256.hexdigest(data)
    end
  end
end
