export function compact(value: number | null | undefined) {
  if (value == null) return "–"
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: Number(value >= 1_000 && value < 10_000),
  }).format(value)
}

const intervals: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function ago(value: string | null) {
  if (!value) return "never"
  const seconds = (Date.now() - new Date(value).getTime()) / 1_000
  for (const [unit, interval] of intervals) {
    if (seconds >= interval) return relative.format(-Math.floor(seconds / interval), unit)
  }
  return "just now"
}

export function ageDays(value: string) {
  return (Date.now() - new Date(value).getTime()) / 86_400_000
}

export function duration(seconds: number | null) {
  if (!seconds) return ""
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.floor(seconds % 3_600 / 60)
  const remaining = seconds % 60
  const pad = (value: number) => String(value).padStart(2, "0")
  return hours ? `${hours}:${pad(minutes)}:${pad(remaining)}` : `${minutes}:${pad(remaining)}`
}

export function multiplier(score: number) {
  return score >= 10 ? `${Math.round(score)}×` : `${score.toFixed(1)}×`
}

export function dayBucket(value: string) {
  const days = ageDays(value)
  return days < 1 ? "Today" : days < 2 ? "Yesterday" : days < 7 ? "This week" : days < 30 ? "This month" : "Earlier"
}
