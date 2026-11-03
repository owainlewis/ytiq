import { useState } from "react"
import { Rss, SearchX, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AddChannelForm } from "@/components/add-channel-form"
import { ChannelFilter, OptionFilter, RANGES, ResetFilters, SearchFilter, ShortsFilter, useParam } from "@/components/filters"
import { EmptyState, ErrorState, PageBody, PageHeader, SectionLabel } from "@/components/page"
import { VideoGrid } from "@/components/video-grid"
import { useChannels, useVideos, type Video } from "@/lib/api"
import { dayBucket } from "@/lib/format"

const PAGE = 60
const DEFAULTS = { days: "30", channel_id: "all", shorts: "", q: "" }

export function FeedPage() {
  const { data: channels, isLoading: channelsLoading, isError: channelsError, refetch: refetchChannels } = useChannels()
  const [days, setDays] = useParam("days", "30")
  const [channel, setChannel] = useParam("channel_id", "all")
  const [shorts] = useParam("shorts")
  const [q, setQ] = useParam("q")
  const [limit, setLimit] = useState(PAGE)
  const { data: videos, isLoading, isError, refetch } = useVideos({
    sort: "newest",
    days,
    channel_id: channel,
    shorts: shorts === "true",
    q,
    limit,
  })

  if (channelsError && !channels) {
    return (
      <>
        <PageHeader title="Feed" />
        <PageBody>
          <ErrorState
            title="Couldn’t load your feed"
            description="The server may be offline. Check that ytiq is running, then try again."
            onRetry={() => refetchChannels()}
          />
        </PageBody>
      </>
    )
  }

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
  const description =
    channels && channels.length > 0
      ? `Latest uploads from ${channels.length} creator${channels.length === 1 ? "" : "s"} you track.`
      : "Latest uploads from the creators you track."

  return (
    <>
      <PageHeader title="Feed" description={description}>
        <SearchFilter />
        <ChannelFilter />
        <OptionFilter param="days" fallback="30" options={RANGES} />
        <div className="ml-auto flex items-center gap-1">
          <ResetFilters defaults={DEFAULTS} />
          <ShortsFilter />
        </div>
      </PageHeader>
      <PageBody className="flex flex-col gap-10">
        {isError ? (
          <ErrorState
            title="Couldn’t load uploads"
            description="The server may be offline. Check that ytiq is running, then try again."
            onRetry={() => refetch()}
          />
        ) : isLoading || !videos ? (
          <VideoGrid videos={undefined} loading />
        ) : videos.length === 0 ? (
          <EmptyState
            icon={q ? SearchX : Rss}
            title={q ? "No matching videos" : "No uploads in this range"}
            description={q ? `Nothing matches “${q}”. Try a different search.` : "Try a longer time range or a different channel."}
          >
            {q ? (
              <Button variant="outline" onClick={() => setQ("")}>
                Clear search
              </Button>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {channel !== "all" && (
                  <Button variant="outline" onClick={() => setChannel("all")}>
                    All channels
                  </Button>
                )}
                {days !== "all" && (
                  <Button variant="outline" onClick={() => setDays("all")}>
                    Search all time
                  </Button>
                )}
              </div>
            )}
          </EmptyState>
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
