import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { compact, multiplier } from "@/lib/format"
import { cn } from "@/lib/utils"

export function scoreTone(score: number) {
  if (score >= 5) return "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
  if (score >= 2) return "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
  if (score >= 1) return "bg-muted text-foreground"
  return "bg-muted text-muted-foreground"
}

export function ScoreBadge({
  score,
  median,
  className,
}: {
  score: number | null
  median?: number | null
  className?: string
}) {
  if (score == null) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex h-5 items-center rounded-md px-1.5 text-xs font-semibold tabular-nums",
            scoreTone(score),
            className,
          )}
        >
          {multiplier(score)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {score.toFixed(1)}× the channel's median{median ? ` of ${compact(median)} views` : ""}
      </TooltipContent>
    </Tooltip>
  )
}
