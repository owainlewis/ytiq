import { useState } from "react"
import { Bookmark, Plus } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NewBoardDialog } from "@/components/new-board-dialog"
import { EmptyState, PageBody, PageHeader } from "@/components/page"
import { useBoards, type Board } from "@/lib/api"

export function BoardsPage() {
  const { data: boards, isLoading } = useBoards()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Boards"
        description="Your swipe file of videos worth learning from."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> New board
          </Button>
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : !boards?.length ? (
          <EmptyState
            icon={Bookmark}
            title="Start your swipe file"
            description="Make a board for each thing you want to study: hooks, thumbnails, titles, formats. Then save videos from anywhere."
          >
            <Button onClick={() => setOpen(true)}>
              <Plus /> Create your first board
            </Button>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}
          </div>
        )}
      </PageBody>
      <NewBoardDialog open={open} onOpenChange={setOpen} onCreated={(b) => navigate(`/boards/${b.id}`)} />
    </>
  )
}

function BoardCard({ board }: { board: Board }) {
  const covers = board.covers.slice(0, 4)
  return (
    <Link to={`/boards/${board.id}`} className="group flex flex-col gap-3">
      <div className="grid aspect-video grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl bg-muted ring-1 ring-black/5 transition group-hover:ring-2 group-hover:ring-primary/40 dark:ring-white/5">
        {covers.length === 0 ? (
          <div className="col-span-2 row-span-2 flex items-center justify-center">
            <Bookmark className="size-6 text-muted-foreground/50" />
          </div>
        ) : (
          covers.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className={
                covers.length === 1
                  ? "col-span-2 row-span-2 size-full object-cover"
                  : covers.length === 2
                    ? "row-span-2 size-full object-cover"
                    : covers.length === 3 && i === 0
                      ? "row-span-2 size-full object-cover"
                      : "size-full object-cover"
              }
            />
          ))
        )}
      </div>
      <div>
        <div className="font-medium">{board.name}</div>
        <div className="text-sm text-muted-foreground">
          {board.item_count} video{board.item_count === 1 ? "" : "s"}
          {board.description ? ` · ${board.description}` : ""}
        </div>
      </div>
    </Link>
  )
}
