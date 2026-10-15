import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { useSearchParams } from "react-router"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ChannelAvatar } from "@/components/video-card"
import { useChannels } from "@/lib/api"

/** Read and write a filter in the URL so views are linkable and survive reloads. */
export function useParam(key: string, fallback = ""): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? fallback
  const set = (v: string) => {
    const next = new URLSearchParams(params)
    if (v === fallback || v === "") next.delete(key)
    else next.set(key, v)
    setParams(next, { replace: true })
  }
  return [value, set]
}

export function SearchFilter() {
  const [q, setQ] = useParam("q")
  const [draft, setDraft] = useState(q)
  useEffect(() => setDraft(q), [q])
  useEffect(() => {
    const t = setTimeout(() => draft !== q && setQ(draft), 300)
    return () => clearTimeout(t)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <InputGroup className="h-8 w-full sm:w-60">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search titles" value={draft} onChange={(e) => setDraft(e.target.value)} />
    </InputGroup>
  )
}

export function ChannelFilter() {
  const [channel, setChannel] = useParam("channel_id", "all")
  const { data: channels = [] } = useChannels()
  return (
    <Select value={channel} onValueChange={setChannel}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All channels</SelectItem>
        {channels.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <ChannelAvatar channelId={c.id} name={c.title} className="size-4" />
            <span className="truncate">{c.title}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function OptionFilter({
  param,
  fallback,
  options,
  className = "w-36",
}: {
  param: string
  fallback: string
  options: [string, string][]
  className?: string
}) {
  const [value, setValue] = useParam(param, fallback)
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const RANGES: [string, string][] = [
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
  ["365", "Last year"],
  ["all", "All time"],
]

export function ShortsFilter() {
  const [shorts, setShorts] = useParam("shorts")
  return (
    <div className="flex items-center gap-2">
      <Switch id="shorts" size="sm" checked={shorts === "true"} onCheckedChange={(c) => setShorts(c ? "true" : "")} />
      <Label htmlFor="shorts" className="text-sm font-normal text-muted-foreground">
        Include Shorts
      </Label>
    </div>
  )
}
