import { Bookmark, Clock, TrendingUp } from "lucide-react"
import { useSearchParams } from "react-router"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ScoreBadge } from "@/components/score-badge"
import { SaveMenu } from "@/components/save-menu"
import type { Video } from "@/lib/api"
import { ageDays, ago, compact, duration } from "@/lib/format"
import { cn } from "@/lib/utils"

export function useOpenVideo() {
  const [params, setParams] = useSearchParams()
  return (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set("v", id)
    else next.delete("v")
    setParams(next, { replace: !id })
  }
}

/** Avatars are served from a local cache; YouTube's image host rate-limits hotlinks. */
export function ChannelAvatar({ channelId, name, className }: { channelId: string; name: string; className?: string }) {
  return (
    <Avatar className={cn("size-5", className)}>
      <AvatarImage src={`/api/channels/${channelId}/avatar`} alt="" loading="lazy" />
      <AvatarFallback className="text-[10px]">{name.slice(0, 1)}</AvatarFallback>
    </Avatar>
  )
}

export function VideoCard({ video, showNote }: { video: Video; showNote?: boolean }) {
  const open = useOpenVideo()
  const saved = video.board_ids.length > 0
  const early = ageDays(video.published_at) < 7

  return (
    <article className="group/card flex min-w-0 cursor-pointer flex-col gap-2.5" onClick={() => open(video.id)}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-black/5 dark:ring-white/5">
        {video.thumbnail_url && (
          <img
            src={video.thumbnail_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
          />
        )}
        {video.duration_seconds ? (
          <span className="absolute right-1.5 bottom-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
            {video.is_short ? "Short" : duration(video.duration_seconds)}
          </span>
        ) : null}
        <SaveMenu videoId={video.id} boardIds={video.board_ids}>
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label="Save to board"
            className={cn(
              "absolute top-1.5 right-1.5 bg-background/90 shadow-sm backdrop-blur transition-opacity",
              saved ? "opacity-100" : "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
            )}
          >
            <Bookmark className={cn(saved && "fill-primary text-primary")} />
          </Button>
        </SaveMenu>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium" title={video.title}>
          {video.title}
        </h3>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <ChannelAvatar channelId={video.channel_id} name={video.channel_title} className="size-4" />
          <span className="truncate">{video.channel_title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
          {/* A low score on a days-old video only means it hasn't had time yet. */}
          {!(early && (video.outlier_score ?? 0) < 1) && <ScoreBadge score={video.outlier_score} median={video.channel_median_views} />}
          <span>{compact(video.view_count)} views</span>
          <span aria-hidden>·</span>
          <span>{ago(video.published_at)}</span>
          {early && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Clock className="size-3.5" aria-label="Early" />
              </TooltipTrigger>
              <TooltipContent>Under 7 days old. The score will keep moving.</TooltipContent>
            </Tooltip>
          )}
          {video.views_per_day ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3" />
              {compact(video.views_per_day)}/day
            </span>
          ) : null}
        </div>
        {showNote && video.note ? (
          <p className="mt-0.5 line-clamp-3 border-l-2 pl-2 text-xs whitespace-pre-wrap text-muted-foreground">{video.note}</p>
        ) : null}
      </div>
    </article>
  )
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="aspect-video rounded-xl" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}
