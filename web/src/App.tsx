import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router"

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
import { SettingsPage } from "@/pages/settings"
import { SetupPage } from "@/pages/setup"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
})

/** Until there's a YouTube key, every page sends you to setup. */
function RequireKey({ children }: { children: ReactNode }) {
  const { data } = useStatus()
  if (!data) return null
  if (!data.api_key_configured) return <Navigate to="/setup" replace />
  return children
}

function Layout() {
  return (
    <RequireKey>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-hidden">
          <Outlet />
        </SidebarInset>
        <VideoSheet />
      </SidebarProvider>
    </RequireKey>
  )
}

const router = createBrowserRouter([
  { path: "/setup", element: <SetupPage /> },
  {
    element: <Layout />,
    children: [
      { path: "/", element: <FeedPage /> },
      { path: "/outliers", element: <OutliersPage /> },
      { path: "/channels", element: <ChannelsPage /> },
      { path: "/channels/:id", element: <ChannelPage /> },
      { path: "/boards", element: <BoardsPage /> },
      { path: "/boards/:id", element: <BoardPage /> },
      { path: "/settings", element: <SettingsPage /> },
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
