export function compact(n: number | null | undefined): string {
  if (n == null) return "–"
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: n < 10_000 && n >= 1000 ? 1 : 0 }).format(n)
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function ago(iso: string | null | undefined): string {
  if (!iso) return "never"
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  for (const [unit, secs] of UNITS) {
    if (s >= secs) return rtf.format(-Math.floor(s / secs), unit)
  }
  return "just now"
}

export const ageDays = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000

export function duration(sec: number | null | undefined): string {
  if (!sec) return ""
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (x: number) => String(x).padStart(2, "0")
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function multiplier(score: number): string {
  return score >= 10 ? `${Math.round(score)}×` : `${score.toFixed(1)}×`
}

/** Bucket a date for feed section headers. */
export function dayBucket(iso: string): string {
  const d = ageDays(iso)
  if (d < 1) return "Today"
  if (d < 2) return "Yesterday"
  if (d < 7) return "This week"
  if (d < 30) return "This month"
  return "Earlier"
}
