import { useState } from "react"
import { ExternalLink, MoreHorizontal, RefreshCw, Trash2, Users } from "lucide-react"
import { useNavigate } from "react-router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AddChannelForm } from "@/components/add-channel-form"
import { EmptyState, PageBody, PageHeader } from "@/components/page"
import { ScoreBadge } from "@/components/score-badge"
import { ChannelAvatar } from "@/components/video-card"
import { useChannels, useRefreshChannel, useUntrackChannel, type Channel } from "@/lib/api"
import { ago, compact } from "@/lib/format"

export function ChannelsPage() {
  const { data: channels, isLoading } = useChannels()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title="Channels" description="The creators in your niche." />
      <PageBody className="flex flex-col gap-6">
        <AddChannelForm className="max-w-xl" />

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : !channels?.length ? (
          <EmptyState
            icon={Users}
            title="No channels yet"
            description="Paste a channel above. Each refresh costs about 3 of your 10,000 daily API units, so you can track a lot of them."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4">Channel</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Subscribers</TableHead>
                  <TableHead className="text-right" title="Median views of recent long-form videos, 7+ days old">
                    Median views
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">Uploads (30d)</TableHead>
                  <TableHead className="hidden md:table-cell">Last upload</TableHead>
                  <TableHead title="Best outlier score in the last 90 days">Best (90d)</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/channels/${c.id}`)}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <ChannelAvatar channelId={c.id} name={c.title} className="size-8" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{c.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{c.handle}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{compact(c.subscriber_count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{compact(c.median_views)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{c.videos_30d}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{ago(c.last_upload)}</TableCell>
                    <TableCell>{c.top_score_90d ? <ScoreBadge score={c.top_score_90d} /> : <span className="text-muted-foreground">–</span>}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ChannelMenu channel={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  )
}

export function ChannelMenu({ channel, onRemoved }: { channel: Channel; onRemoved?: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const refresh = useRefreshChannel()
  const untrack = useUntrackChannel()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Channel actions">
            {refresh.isPending ? <RefreshCw className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => refresh.mutate(channel.id)}>
            <RefreshCw /> Refresh now
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://www.youtube.com/channel/${channel.id}`} target="_blank" rel="noopener">
              <ExternalLink /> Open on YouTube
            </a>
          </DropdownMenuItem>
          {channel.tracked ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
                <Trash2 /> Stop tracking
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop tracking {channel.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its videos leave your feed and outliers. Anything you saved to a board stays there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => untrack.mutate(channel.id, { onSuccess: onRemoved })}>
              Stop tracking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
