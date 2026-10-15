import { useState } from "react"
import { Rss, SearchX, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AddChannelForm } from "@/components/add-channel-form"
import { ChannelFilter, OptionFilter, RANGES, SearchFilter, ShortsFilter, useParam } from "@/components/filters"
import { EmptyState, PageBody, PageHeader, SectionLabel } from "@/components/page"
import { VideoGrid } from "@/components/video-grid"
import { useChannels, useVideos, type Video } from "@/lib/api"
import { dayBucket } from "@/lib/format"

const PAGE = 60

export function FeedPage() {
  const { data: channels, isLoading: channelsLoading } = useChannels()
  const [days] = useParam("days", "30")
  const [channel] = useParam("channel_id", "all")
  const [shorts] = useParam("shorts")
  const [q] = useParam("q")
  const [limit, setLimit] = useState(PAGE)
  const { data: videos, isLoading } = useVideos({ sort: "newest", days, channel_id: channel, shorts: shorts === "true", q, limit })

  if (!channelsLoading && channels?.length === 0) {
    return (
      <>
        <PageHeader title="Feed" />
        <PageBody>
          <EmptyState
            icon={Users}
            title="Build your niche feed"
            description="Add the creators you want to keep an eye on. Their latest uploads land here, and their breakout videos show up in Outliers."
          >
            <AddChannelForm autoFocus />
          </EmptyState>
        </PageBody>
      </>
    )
  }

  const groups = groupByDay(videos ?? [])

  return (
    <>
      <PageHeader title="Feed" description="Latest uploads from the creators you track.">
        <SearchFilter />
        <ChannelFilter />
        <OptionFilter param="days" fallback="30" options={RANGES} />
        <div className="ml-auto">
          <ShortsFilter />
        </div>
      </PageHeader>
      <PageBody className="flex flex-col gap-10">
        {isLoading || !videos ? (
          <VideoGrid videos={undefined} loading />
        ) : videos.length === 0 ? (
          <EmptyState
            icon={q ? SearchX : Rss}
            title={q ? "No matching videos" : "No uploads in this range"}
            description="Try a longer time range or a different channel."
          />
        ) : (
          groups.map(([label, items]) => (
            <section key={label}>
              <SectionLabel>{label}</SectionLabel>
              <VideoGrid videos={items} />
            </section>
          ))
        )}
        {videos && videos.length >= limit && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setLimit(limit + PAGE)}>
              Load more
            </Button>
          </div>
        )}
      </PageBody>
    </>
  )
}

function groupByDay(videos: Video[]): [string, Video[]][] {
  const map = new Map<string, Video[]>()
  for (const v of videos) {
    const key = dayBucket(v.published_at)
    map.set(key, [...(map.get(key) ?? []), v])
  }
  return [...map.entries()]
}
