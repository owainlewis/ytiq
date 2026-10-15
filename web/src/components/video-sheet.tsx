import { useEffect, useRef, useState } from "react"
import { Bookmark, ExternalLink, Trash2, X } from "lucide-react"
import { Link, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ScoreBadge } from "@/components/score-badge"
import { SaveMenu } from "@/components/save-menu"
import { Sparkline } from "@/components/sparkline"
import { ChannelAvatar, useOpenVideo } from "@/components/video-card"
import { useBoardItem, useUpdateNote, useVideo, type VideoDetail } from "@/lib/api"
import { ago, compact, duration } from "@/lib/format"

/** Video detail, opened from anywhere via the ?v=<id> search param. */
export function VideoSheet() {
  const [params] = useSearchParams()
  const id = params.get("v")
  const open = useOpenVideo()
  const { data: video, isLoading } = useVideo(id)

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && open(null)}>
      <SheetContent showCloseButton={false} className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-2xl">
        <SheetClose asChild>
          <Button size="icon-sm" aria-label="Close" className="absolute top-3 right-3 z-10 rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80">
            <X />
          </Button>
        </SheetClose>
        {isLoading || !video ? <SheetSkeleton /> : <Detail video={video} />}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5" title={hint}>
      <div className="text-lg font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function Detail({ video }: { video: VideoDetail }) {
  const [expanded, setExpanded] = useState(false)
  const likeRate = video.view_count ? ((video.like_count ?? 0) / video.view_count) * 100 : null
  const url = `https://www.youtube.com/watch?v=${video.id}`

  return (
    <>
      <div className="aspect-video w-full shrink-0 bg-black">
        <iframe
          key={video.id}
          className="size-full"
          src={`https://www.youtube-nocookie.com/embed/${video.id}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <SheetHeader className="gap-3 px-6 pt-5 pb-0">
        <SheetTitle className="pr-6 text-lg leading-snug">{video.title}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Link to={`/channels/${video.channel_id}`} className="flex items-center gap-2 font-medium text-foreground hover:underline">
              <ChannelAvatar channelId={video.channel_id} name={video.channel_title} className="size-6" />
              {video.channel_title}
            </Link>
            <span className="text-muted-foreground">{compact(video.channel_subscribers)} subscribers</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {ago(video.published_at)}
              {video.duration_seconds ? ` · ${video.is_short ? "Short" : duration(video.duration_seconds)}` : ""}
            </span>
          </div>
        </SheetDescription>
        <div className="flex gap-2">
          <SaveMenu videoId={video.id} boardIds={video.board_ids} align="start">
            <Button size="sm" variant={video.board_ids.length ? "secondary" : "default"}>
              <Bookmark className={video.board_ids.length ? "fill-current" : ""} />
              {video.board_ids.length ? `Saved to ${video.board_ids.length} board${video.board_ids.length > 1 ? "s" : ""}` : "Save"}
            </Button>
          </SaveMenu>
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener">
              <ExternalLink /> YouTube
            </a>
          </Button>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Outlier score"
            value={
              video.outlier_score != null ? (
                <ScoreBadge score={video.outlier_score} median={video.channel_median_views} className="h-6 px-2 text-sm" />
              ) : (
                "–"
              )
            }
          />
          <Stat label="Views" value={compact(video.view_count)} />
          <Stat label="Views / day now" value={video.views_per_day ? compact(video.views_per_day) : "–"} />
          <Stat label="Like rate" value={likeRate != null ? `${likeRate.toFixed(1)}%` : "–"} />
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          {video.outlier_score != null
            ? `${video.outlier_score.toFixed(1)}× ${video.channel_title}'s median of ${compact(video.channel_median_views)} views. `
            : "Not enough history on this channel to score yet. "}
          {compact(video.like_count)} likes · {compact(video.comment_count)} comments
        </p>

        <section>
          <h3 className="mb-2 text-sm font-medium">Growth</h3>
          <Sparkline points={video.snapshots} />
        </section>

        {video.boards.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Notes</h3>
            {video.boards.map((b) => (
              <BoardNote key={b.id} videoId={video.id} board={b} />
            ))}
          </section>
        )}

        {video.description && (
          <section>
            <Separator className="mb-5" />
            <h3 className="mb-2 text-sm font-medium">Description</h3>
            <p className={`text-sm whitespace-pre-wrap text-muted-foreground ${expanded ? "" : "line-clamp-4"}`}>{video.description}</p>
            <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : "Show more"}
            </Button>
          </section>
        )}
      </div>
    </>
  )
}

function BoardNote({ videoId, board }: { videoId: string; board: { id: number; name: string; note: string } }) {
  const [note, setNote] = useState(board.note)
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")
  const update = useUpdateNote()
  const remove = useBoardItem()
  const timer = useRef<number>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const change = (value: string) => {
    setNote(value)
    setState("saving")
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      update.mutate({ boardId: board.id, videoId, note: value }, { onSuccess: () => setState("saved") })
    }, 600)
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link to={`/boards/${board.id}`} className="text-sm font-medium hover:underline">
          {board.name}
        </Link>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}</span>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Remove from ${board.name}`}
            onClick={() => remove.mutate({ boardId: board.id, video: videoId, remove: true })}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <Textarea
        value={note}
        onChange={(e) => change(e.target.value)}
        placeholder="What makes this work? Hook, title, thumbnail, format…"
        className="min-h-20 resize-y border-0 bg-muted/50 shadow-none focus-visible:ring-1"
      />
    </div>
  )
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-3 px-6">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
