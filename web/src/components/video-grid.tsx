import type { ReactNode } from "react"

import { VideoCard, VideoCardSkeleton } from "@/components/video-card"
import type { Video } from "@/lib/api"
import { cn } from "@/lib/utils"

export const gridClass = "grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"

export function VideoGrid({
  videos,
  loading,
  empty,
  showNotes,
  className,
}: {
  videos: Video[] | undefined
  loading?: boolean
  empty?: ReactNode
  showNotes?: boolean
  className?: string
}) {
  if (loading && !videos) {
    return (
      <div className={cn(gridClass, className)}>
        {Array.from({ length: 10 }, (_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (!videos?.length) return <>{empty}</>
  return (
    <div className={cn(gridClass, className)}>
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} showNote={showNotes} />
      ))}
    </div>
  )
}
