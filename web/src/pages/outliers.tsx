import { useState } from "react"
import { Flame, Info } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChannelFilter, OptionFilter, SearchFilter, ShortsFilter, useParam } from "@/components/filters"
import { EmptyState, PageBody, PageHeader } from "@/components/page"
import { VideoGrid } from "@/components/video-grid"
import { useChannels, useVideos } from "@/lib/api"

const PAGE = 60

const SORTS: [string, string, string][] = [
  ["score", "Top score", "Views ÷ the channel's median views"],
  ["rising", "Rising", "Fastest growth right now, relative to channel size"],
  ["views", "Most views", "Raw view count"],
]

export function OutliersPage() {
  const { data: channels } = useChannels()
  const [sort, setSort] = useParam("sort", "score")
  const [days] = useParam("days", "90")
  const [minScore] = useParam("min_score", "2")
  const [channel] = useParam("channel_id", "all")
  const [shorts] = useParam("shorts")
  const [q] = useParam("q")
  const [limit, setLimit] = useState(PAGE)
  const { data: videos, isLoading } = useVideos({
    sort,
    days,
    min_score: minScore === "any" ? "" : minScore,
    channel_id: channel,
    shorts: shorts === "true",
    q,
    limit,
  })

  return (
    <>
      <PageHeader
        title="Outliers"
        description="Videos beating their channel's usual performance."
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="How scores work">
                <Info />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-72 text-left leading-relaxed">
              Score = views ÷ the channel's median views (its last 30 videos of the same format, 7+ days old). 2× means twice
              the channel's normal. The clock icon marks videos under a week old, whose score is still climbing.
            </TooltipContent>
          </Tooltip>
        }
      >
        <ToggleGroup type="single" variant="outline" size="sm" value={sort} onValueChange={(v) => v && setSort(v)} spacing={0}>
          {SORTS.map(([value, label, hint]) => (
            <ToggleGroupItem key={value} value={value} title={hint} className="h-8 px-3">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <OptionFilter
          param="min_score"
          fallback="2"
          className="w-32"
          options={[
            ["any", "Any score"],
            ["1.5", "1.5× or more"],
            ["2", "2× or more"],
            ["3", "3× or more"],
            ["5", "5× or more"],
            ["10", "10× or more"],
          ]}
        />
        <OptionFilter
          param="days"
          fallback="90"
          options={[
            ["30", "Last 30 days"],
            ["90", "Last 90 days"],
            ["365", "Last year"],
            ["all", "All time"],
          ]}
        />
        <ChannelFilter />
        <SearchFilter />
        <div className="ml-auto">
          <ShortsFilter />
        </div>
      </PageHeader>
      <PageBody className="flex flex-col gap-8">
        <VideoGrid
          videos={videos}
          loading={isLoading}
          empty={
            channels?.length === 0 ? (
              <EmptyState icon={Flame} title="No channels yet" description="Track a few creators and their breakout videos will show up here.">
                <Button asChild>
                  <Link to="/channels">Add channels</Link>
                </Button>
              </EmptyState>
            ) : (
              <EmptyState icon={Flame} title="No outliers match" description="Lower the score threshold or widen the time range." />
            )
          }
        />
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
