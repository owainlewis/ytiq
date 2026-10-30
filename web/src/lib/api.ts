import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type Video = {
  id: string
  channel_id: string
  title: string
  thumbnail_url: string | null
  published_at: string
  duration_seconds: number | null
  is_short: boolean
  view_count: number | null
  like_count: number | null
  comment_count: number | null
  outlier_score: number | null
  views_per_day: number | null
  channel_title: string
  channel_thumbnail: string | null
  channel_handle: string | null
  channel_median_views: number | null
  channel_subscribers: number | null
  board_ids: number[]
  note?: string
  added_at?: string
}

export type VideoDetail = Video & {
  description: string
  snapshots: { taken_at: string; view_count: number }[]
  boards: { id: number; name: string; note: string }[]
}

export type Channel = {
  id: string
  title: string
  handle: string | null
  thumbnail_url: string | null
  subscriber_count: number | null
  video_count: number | null
  view_count: number | null
  median_views: number | null
  tracked: number
  refreshed_at: string | null
  videos_30d: number
  last_upload: string | null
  top_score_90d: number | null
}

export type Board = {
  id: number
  name: string
  description: string
  created_at: string
  item_count: number
  covers: string[]
}

export type BoardDetail = Board & { items: Video[] }

export type Status = {
  api_key_configured: boolean
  quota_used: number
  quota_limit: number
  channels: number
  videos: number
  last_refreshed: string | null
  running: boolean
  last_run: string | null
  last_result: { refreshed: number; errors: string[] } | null
}

export type VideoQuery = {
  sort?: string
  days?: string
  channel_id?: string
  shorts?: boolean
  min_score?: string
  q?: string
  limit?: number
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch("/api" + path, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      message = (await res.json()).detail ?? message
    } catch {
      /* not JSON */
    }
    throw new Error(message)
  }
  return (res.status === 204 ? null : await res.json()) as T
}

function qs(q: VideoQuery) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "" || v === "all" || v === false) continue
    p.set(k, String(v))
  }
  return p.toString()
}

// Same filters as useVideos, all matching rows, as a CSV download.
export const videosCsvUrl = ({ limit: _, ...q }: VideoQuery) => `/api/videos.csv?${qs(q)}`

// ---- Queries ------------------------------------------------------------------

export const useStatus = () =>
  useQuery({
    queryKey: ["status"],
    queryFn: () => request<Status>("/status"),
    refetchInterval: (q) => (q.state.data?.running ? 2000 : 30000),
  })

export const useChannels = () => useQuery({ queryKey: ["channels"], queryFn: () => request<Channel[]>("/channels") })

export const useChannel = (id: string) =>
  useQuery({ queryKey: ["channels", id], queryFn: () => request<Channel>(`/channels/${id}`) })

export const useVideos = (q: VideoQuery) =>
  useQuery({
    queryKey: ["videos", q],
    queryFn: () => request<Video[]>(`/videos?${qs(q)}`),
    placeholderData: keepPreviousData,
  })

export const useVideo = (id: string | null) =>
  useQuery({ queryKey: ["video", id], queryFn: () => request<VideoDetail>(`/videos/${id}`), enabled: !!id })

export const useBoards = () => useQuery({ queryKey: ["boards"], queryFn: () => request<Board[]>("/boards") })

export const useBoard = (id: string) =>
  useQuery({ queryKey: ["boards", id], queryFn: () => request<BoardDetail>(`/boards/${id}`) })

// ---- Mutations ----------------------------------------------------------------

const onError = (e: Error) => toast.error(e.message)

export function useAddChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: string) => request<Channel>("/channels", { method: "POST", json: { input } }),
    onSuccess: (c) => {
      toast.success(`Now tracking ${c.title}`)
      qc.invalidateQueries()
    },
    onError,
  })
}

export function useRefreshChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<{ videos: number }>(`/channels/${id}/refresh`, { method: "POST" }),
    onSuccess: (r) => {
      toast.success(`Updated ${r.videos} videos`)
      qc.invalidateQueries()
    },
    onError,
  })
}

export function useUntrackChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<null>(`/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
    onError,
  })
}

export function useRefreshAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => request<Status>("/refresh", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
    onError,
  })
}

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: { name: string; description?: string }) => request<Board>("/boards", { method: "POST", json: b }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
    onError,
  })
}

export function useUpdateBoard(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: { name?: string; description?: string }) => request<Board>(`/boards/${id}`, { method: "PATCH", json: b }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
    onError,
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => request<null>(`/boards/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
    onError,
  })
}

/** Add or remove a video from a board. `video` can be an id or any YouTube URL. */
export function useBoardItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, video, remove }: { boardId: number; video: string; remove?: boolean }) =>
      remove
        ? request<null>(`/boards/${boardId}/items/${video}`, { method: "DELETE" })
        : request<{ video_id: string }>(`/boards/${boardId}/items`, { method: "POST", json: { video } }),
    onSuccess: () => qc.invalidateQueries(),
    onError,
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, videoId, note }: { boardId: number; videoId: string; note: string }) =>
      request(`/boards/${boardId}/items/${videoId}`, { method: "PATCH", json: { note } }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["boards", String(v.boardId)] })
      qc.invalidateQueries({ queryKey: ["video", v.videoId] })
    },
    onError,
  })
}
