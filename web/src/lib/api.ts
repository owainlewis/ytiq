import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type Channel = {
  id: string
  title: string
  handle: string | null
  subscriber_count: number | null
  median_views: number | null
  videos_30d: number
  last_upload: string | null
  top_score_90d: number | null
  refreshed_at: string | null
  tracked: number
}

export type Video = {
  id: string
  channel_id: string
  channel_title: string
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
  channel_median_views: number | null
  channel_subscribers: number | null
  board_ids: number[]
  note?: string
}

export type VideoDetail = Video & {
  description: string | null
  snapshots: { taken_at: string; view_count: number }[]
  boards: { id: number; name: string; note: string }[]
}

export type Board = {
  id: number
  name: string
  description: string
  item_count: number
  covers: string[]
}
type BoardFields = Pick<Board, "id" | "name" | "description">
type BoardDetail = BoardFields & { items: Video[] }

type Status = {
  api_key_configured: boolean
  quota_used: number
  quota_limit: number
  last_refreshed: string | null
  running: boolean
  last_result: { refreshed: number; errors: string[] } | null
}

type VideoFilters = {
  sort?: string
  days?: string
  channel_id?: string
  shorts?: boolean
  min_score?: string
  q?: string
  limit?: number
  offset?: number
}

async function api<T>(path: string, options?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...init } = options ?? {}
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: json === undefined ? undefined : { "Content-Type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
  })
  if (!response.ok) {
    let message = response.statusText
    try {
      message = (await response.json()).detail ?? message
    } catch {}
    throw new Error(message)
  }
  return response.status === 204 ? null as T : response.json() as Promise<T>
}

function queryParams(filters: VideoFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "" && value !== "all" && value !== false) {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: () => api<Status>("/status"),
    refetchInterval: (query) => query.state.data?.running ? 2_000 : 30_000,
  })
}

export function useChannels() {
  return useQuery({ queryKey: ["channels"], queryFn: () => api<Channel[]>("/channels") })
}

export function useChannel(id: string) {
  return useQuery({ queryKey: ["channels", id], queryFn: () => api<Channel>(`/channels/${id}`) })
}

export function useVideos(filters: VideoFilters) {
  return useQuery({
    queryKey: ["videos", filters],
    queryFn: () => api<Video[]>(`/videos?${queryParams(filters)}`),
    placeholderData: keepPreviousData,
  })
}

export function useVideo(id: string | null) {
  return useQuery({
    queryKey: ["video", id],
    queryFn: () => api<VideoDetail>(`/videos/${id}`),
    enabled: !!id,
  })
}

export function useBoards() {
  return useQuery({ queryKey: ["boards"], queryFn: () => api<Board[]>("/boards") })
}

export function useBoard(id: string) {
  return useQuery({ queryKey: ["boards", id], queryFn: () => api<BoardDetail>(`/boards/${id}`) })
}

const onError = (error: Error) => toast.error(error.message)

export function useAddChannel() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: string) => api<Channel>("/channels", { method: "POST", json: { input } }),
    onSuccess: (channel) => {
      toast.success(`Now tracking ${channel.title}`)
      client.invalidateQueries()
    },
    onError,
  })
}

export function useRefreshChannel() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<{ videos: number }>(`/channels/${id}/refresh`, { method: "POST" }),
    onSuccess: (result) => {
      toast.success(`Updated ${result.videos} videos`)
      client.invalidateQueries()
    },
    onError,
  })
}

export function useUntrackChannel() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<null>(`/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries(),
    onError,
  })
}

export function useRefreshAll() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ started: boolean }>("/refresh", { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["status"] }),
    onError,
  })
}

export function useCreateBoard() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (board: { name: string; description?: string }) => api<BoardFields>("/boards", { method: "POST", json: board }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["boards"] }),
    onError,
  })
}

export function useUpdateBoard(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (board: { name: string; description: string }) => api<BoardFields>(`/boards/${id}`, { method: "PATCH", json: board }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["boards"] }),
    onError,
  })
}

export function useDeleteBoard() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<null>(`/boards/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries(),
    onError,
  })
}

export function useBoardItem() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, video, remove }: { boardId: number; video: string; remove?: boolean }) =>
      remove
        ? api<null>(`/boards/${boardId}/items/${video}`, { method: "DELETE" })
        : api<{ board_id: number; video_id: string }>(`/boards/${boardId}/items`, { method: "POST", json: { video } }),
    onSuccess: () => client.invalidateQueries(),
    onError,
  })
}

export function useUpdateNote() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, videoId, note }: { boardId: number; videoId: string; note: string }) =>
      api<{ ok: boolean }>(`/boards/${boardId}/items/${videoId}`, { method: "PATCH", json: { note } }),
    onSuccess: (_, { boardId, videoId }) => {
      client.invalidateQueries({ queryKey: ["boards", String(boardId)] })
      client.invalidateQueries({ queryKey: ["video", videoId] })
    },
    onError,
  })
}
