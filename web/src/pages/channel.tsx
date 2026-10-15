import { ArrowLeft, Video as VideoIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ShortsFilter, useParam } from "@/components/filters"
import { EmptyState, PageBody, PageHeader } from "@/components/page"
import { ScoreBadge } from "@/components/score-badge"
import { ChannelAvatar } from "@/components/video-card"
import { VideoGrid } from "@/components/video-grid"
import { ChannelMenu } from "@/pages/channels"
import { useChannel, useVideos } from "@/lib/api"
import { ago, compact } from "@/lib/format"

export function ChannelPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { data: channel, isLoading, error } = useChannel(id)
  const [sort, setSort] = useParam("sort", "newest")
  const [shorts] = useParam("shorts")
  const { data: videos, isLoading: videosLoading } = useVideos({ channel_id: id, sort, shorts: shorts === "true", limit: 200 })

  if (error) {
    return (
      <PageBody>
        <EmptyState icon={VideoIcon} title="Channel not found">
          <Button variant="outline" asChild>
            <Link to="/channels">Back to channels</Link>
          </Button>
        </EmptyState>
      </PageBody>
    )
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" asChild className="-ml-2">
              <Link to="/channels" aria-label="Back to channels">
                <ArrowLeft />
              </Link>
            </Button>
            {channel?.title ?? <Skeleton className="h-5 w-40" />}
          </span>
        }
        actions={channel && <ChannelMenu channel={channel} onRemoved={() => navigate("/channels")} />}
      >
        <ToggleGroup type="single" variant="outline" size="sm" spacing={0} value={sort} onValueChange={(v) => v && setSort(v)}>
          <ToggleGroupItem value="newest" className="h-8 px-3">
            Latest
          </ToggleGroupItem>
          <ToggleGroupItem value="score" className="h-8 px-3">
            Top score
          </ToggleGroupItem>
          <ToggleGroupItem value="views" className="h-8 px-3">
            Most views
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="ml-auto">
          <ShortsFilter />
        </div>
      </PageHeader>

      <PageBody className="flex flex-col gap-8">
        {isLoading || !channel ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : (
          <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <ChannelAvatar channelId={channel.id} name={channel.title} className="size-14" />
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold tracking-tight">{channel.title}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {channel.handle} · refreshed {ago(channel.refreshed_at)}
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
              <Metric label="Subscribers" value={compact(channel.subscriber_count)} />
              <Metric label="Median views" value={compact(channel.median_views)} />
              <Metric label="Uploads (30d)" value={channel.videos_30d} />
              <Metric
                label="Best (90d)"
                value={channel.top_score_90d ? <ScoreBadge score={channel.top_score_90d} median={channel.median_views} /> : "–"}
              />
            </dl>
          </div>
        )}
        <VideoGrid
          videos={videos}
          loading={videosLoading}
          empty={<EmptyState icon={VideoIcon} title="No videos yet" description="Refresh the channel to pull its latest uploads." />}
        />
      </PageBody>
    </>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
