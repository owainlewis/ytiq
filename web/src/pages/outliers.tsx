import { useState } from "react"
import { Download, Flame, Info } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChannelFilter, OptionFilter, ResetFilters, SearchFilter, ShortsFilter, useParam } from "@/components/filters"
import { EmptyState, ErrorState, PageBody, PageHeader } from "@/components/page"
import { VideoGrid } from "@/components/video-grid"
import { useChannels, useVideos, videosCsvUrl } from "@/lib/api"

const PAGE = 60
const DEFAULTS = { sort: "score", days: "90", min_score: "2", channel_id: "all", shorts: "", q: "" }

const SORTS: [string, string, string][] = [
  ["score", "Top score", "Views ÷ the channel's median views"],
  ["rising", "Rising", "Fastest growth right now, relative to channel size"],
  ["views", "Most views", "Raw view count"],
]

export function OutliersPage() {
  const { data: channels } = useChannels()
  const [sort, setSort] = useParam("sort", "score")
  const [days, setDays] = useParam("days", "90")
  const [minScore, setMinScore] = useParam("min_score", "2")
  const [channel, setChannel] = useParam("channel_id", "all")
  const [shorts] = useParam("shorts")
  const [q, setQ] = useParam("q")
  const [limit, setLimit] = useState(PAGE)
  const query = {
    sort,
    days,
    min_score: minScore === "any" ? "" : minScore,
    channel_id: channel,
    shorts: shorts === "true",
    q,
  }
  const { data: videos, isLoading, isError, refetch } = useVideos({ ...query, limit })

  const count = videos?.length
  const description =
    count == null
      ? "Videos beating their channel's usual performance."
      : `${count}${count >= limit ? "+" : ""} video${count === 1 ? "" : "s"} ${
          minScore === "any" ? "beating their channel's usual performance" : `at ${minScore}× or more of their channel's median views`
        }.`

  return (
    <>
      <PageHeader
        title="Outliers"
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href={videosCsvUrl(query)} download title="Download every video matching these filters">
                <Download />
                Export CSV
              </a>
            </Button>
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
          </>
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
        <div className="ml-auto flex items-center gap-1">
          <ResetFilters defaults={DEFAULTS} />
          <ShortsFilter />
        </div>
      </PageHeader>
      <PageBody className="flex flex-col gap-8">
        {isError ? (
          <ErrorState
            title="Couldn’t load outliers"
            description="The server may be offline. Check that ytiq is running, then try again."
            onRetry={() => refetch()}
          />
        ) : (
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
                <EmptyState icon={Flame} title="No outliers match" description="Lower the score threshold or widen the time range.">
                  <div className="flex flex-wrap justify-center gap-2">
                    {minScore !== "any" && (
                      <Button variant="outline" onClick={() => setMinScore("1.5")}>
                        Lower to 1.5×
                      </Button>
                    )}
                    {days !== "all" && (
                      <Button variant="outline" onClick={() => setDays("all")}>
                        Search all time
                      </Button>
                    )}
                    {channel !== "all" && (
                      <Button variant="outline" onClick={() => setChannel("all")}>
                        All channels
                      </Button>
                    )}
                    {q && (
                      <Button variant="outline" onClick={() => setQ("")}>
                        Clear search
                      </Button>
                    )}
                  </div>
                </EmptyState>
              )
            }
          />
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
