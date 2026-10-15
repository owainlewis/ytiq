import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { KeyRound } from "lucide-react"
import { createBrowserRouter, Outlet, RouterProvider } from "react-router"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/app-sidebar"
import { VideoSheet } from "@/components/video-sheet"
import { useStatus } from "@/lib/api"
import { BoardPage } from "@/pages/board"
import { BoardsPage } from "@/pages/boards"
import { ChannelPage } from "@/pages/channel"
import { ChannelsPage } from "@/pages/channels"
import { FeedPage } from "@/pages/feed"
import { OutliersPage } from "@/pages/outliers"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
})

function ApiKeyBanner() {
  const { data } = useStatus()
  if (!data || data.api_key_configured) return null
  return (
    <div className="flex items-start gap-3 border-b bg-amber-50 px-6 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <KeyRound className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">Add your YouTube API key.</span> Put <code className="rounded bg-black/5 px-1 dark:bg-white/10">YOUTUBE_API_KEY=…</code> in{" "}
        <code className="rounded bg-black/5 px-1 dark:bg-white/10">.env</code> and restart the server.
      </p>
    </div>
  )
}

function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <ApiKeyBanner />
        <Outlet />
      </SidebarInset>
      <VideoSheet />
    </SidebarProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <FeedPage /> },
      { path: "/outliers", element: <OutliersPage /> },
      { path: "/channels", element: <ChannelsPage /> },
      { path: "/channels/:id", element: <ChannelPage /> },
      { path: "/boards", element: <BoardsPage /> },
      { path: "/boards/:id", element: <BoardPage /> },
      { path: "*", element: <FeedPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
