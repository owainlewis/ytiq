import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Flame, LayoutGrid, Monitor, Moon, Plus, RefreshCw, Rss, Sun, Users } from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NewBoardDialog } from "@/components/new-board-dialog"
import { useBoards, useChannels, useRefreshAll, useStatus } from "@/lib/api"
import { ago } from "@/lib/format"
import { setTheme, useTheme, type Theme } from "@/lib/theme"

const research = [
  { to: "/", label: "Feed", icon: Rss, end: true },
  { to: "/outliers", label: "Outliers", icon: Flame },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { data: boards = [] } = useBoards()
  const { data: channels = [] } = useChannels()
  const [newBoard, setNewBoard] = useState(false)
  const navigate = useNavigate()

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <NavLink to="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">ytiq</span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Research</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {research.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={item.end ? pathname === item.to : pathname.startsWith(item.to)}>
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/channels")}>
                  <NavLink to="/channels">
                    <Users />
                    <span>Channels</span>
                  </NavLink>
                </SidebarMenuButton>
                {channels.length > 0 && <SidebarMenuBadge>{channels.length}</SidebarMenuBadge>}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Swipe file</SidebarGroupLabel>
          <SidebarGroupAction title="New board" onClick={() => setNewBoard(true)}>
            <Plus />
            <span className="sr-only">New board</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/boards"}>
                  <NavLink to="/boards">
                    <LayoutGrid />
                    <span>All boards</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {boards.map((b) => (
                <SidebarMenuItem key={b.id}>
                  <SidebarMenuButton asChild isActive={pathname === `/boards/${b.id}`}>
                    <NavLink to={`/boards/${b.id}`}>
                      <span className="ml-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span>{b.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{b.item_count}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SyncStatus />
        <ThemeSwitch />
      </SidebarFooter>

      <NewBoardDialog open={newBoard} onOpenChange={setNewBoard} onCreated={(b) => navigate(`/boards/${b.id}`)} />
    </Sidebar>
  )
}

function SyncStatus() {
  const { data: s } = useStatus()
  const refresh = useRefreshAll()
  const qc = useQueryClient()
  const wasRunning = useRef(false)

  // Toast and reload data when a background refresh finishes.
  useEffect(() => {
    if (!s) return
    if (wasRunning.current && !s.running) {
      const r = s.last_result
      if (r?.errors.length) toast.error(`Refreshed ${r.refreshed} channels. ${r.errors.length} failed`, { description: r.errors[0] })
      else toast.success(`Refreshed ${r?.refreshed ?? 0} channels`)
      qc.invalidateQueries()
    }
    wasRunning.current = s.running
  }, [s, qc])

  if (!s) return null
  const pct = Math.min(100, (s.quota_used / s.quota_limit) * 100)

  return (
    <div className="rounded-lg border bg-background p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium">{s.running ? "Refreshing…" : `Updated ${ago(s.last_refreshed)}`}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Refresh all channels"
              disabled={s.running || !s.api_key_configured}
              onClick={() => refresh.mutate()}
            >
              <RefreshCw className={s.running ? "animate-spin" : ""} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh all channels now</TooltipContent>
        </Tooltip>
      </div>
      <p className="mt-0.5 text-muted-foreground">Refreshes on startup, or tap to refresh now</p>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mt-2.5">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
            </div>
            <p className="mt-1.5 text-muted-foreground tabular-nums">
              {s.quota_used.toLocaleString()} / {s.quota_limit.toLocaleString()} API units today
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-56">
          YouTube allows 10,000 units a day, reset at midnight Pacific. Each channel refresh costs about 3.
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function ThemeSwitch() {
  const theme = useTheme()
  const options: [Theme, typeof Sun, string][] = [
    ["light", Sun, "Light"],
    ["dark", Moon, "Dark"],
    ["system", Monitor, "System"],
  ]
  return (
    <div className="flex items-center gap-0.5 self-start rounded-lg border bg-background p-0.5">
      {options.map(([value, Icon, label]) => (
        <Button
          key={value}
          size="icon-xs"
          variant={theme === value ? "secondary" : "ghost"}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  )
}
