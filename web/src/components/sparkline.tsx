import { useId } from "react"

import { ago, compact } from "@/lib/format"

/** Area chart of view snapshots. */
export function Sparkline({ points }: { points: { taken_at: string; view_count: number }[] }) {
  const gradient = useId()
  if (points.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
        The growth chart fills in after a few refreshes.
      </div>
    )
  }
  const w = 600
  const h = 96
  const xs = points.map((p) => new Date(p.taken_at).getTime())
  const ys = points.map((p) => p.view_count)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const sx = (x: number) => ((x - x0) / (x1 - x0 || 1)) * w
  const sy = (y: number) => h - 6 - ((y - y0) / (y1 - y0 || 1)) * (h - 12)
  const line = points.map((_, i) => `${i ? "L" : "M"}${sx(xs[i]).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join("")

  return (
    <div className="rounded-xl border bg-card p-3">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-24 w-full text-primary">
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${w},${h}L0,${h}Z`} fill={`url(#${gradient})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>
          {compact(y0)} views · {ago(points[0].taken_at)}
        </span>
        <span>{compact(y1)} now</span>
      </div>
    </div>
  )
}
