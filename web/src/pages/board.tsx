import { useState } from "react"
import { Bookmark, Link2, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

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
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { NewBoardDialog } from "@/components/new-board-dialog"
import { EmptyState, PageBody, PageHeader } from "@/components/page"
import { VideoGrid } from "@/components/video-grid"
import { useBoard, useBoardItem, useDeleteBoard } from "@/lib/api"

export function BoardPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { data: board, isLoading, error } = useBoard(id)
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const del = useDeleteBoard()

  if (error) {
    return (
      <PageBody>
        <EmptyState icon={Bookmark} title="Board not found">
          <Button variant="outline" asChild>
            <Link to="/boards">Back to boards</Link>
          </Button>
        </EmptyState>
      </PageBody>
    )
  }

  return (
    <>
      <PageHeader
        title={board?.name ?? ""}
        description={board?.description || `${board?.items.length ?? 0} videos`}
        actions={
          board && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Board actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => setEdit(true)}>
                  <Pencil /> Edit board
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
                  <Trash2 /> Delete board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
      <PageBody className="flex flex-col gap-6">
        {board && <AddByUrl boardId={board.id} />}
        <VideoGrid
          videos={board?.items}
          loading={isLoading}
          showNotes
          empty={
            <EmptyState
              icon={Bookmark}
              title="Nothing saved yet"
              description="Paste a YouTube link above, or use the bookmark on any video in your feed."
            />
          }
        />
      </PageBody>

      {board && (
        <>
          <NewBoardDialog open={edit} onOpenChange={setEdit} board={board} />
          <AlertDialog open={confirm} onOpenChange={setConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{board.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the board and its notes. The videos stay in your feed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => del.mutate(board.id, { onSuccess: () => navigate("/boards") })}
                >
                  Delete board
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  )
}

function AddByUrl({ boardId }: { boardId: number }) {
  const [url, setUrl] = useState("")
  const add = useBoardItem()
  return (
    <form
      className="max-w-xl"
      onSubmit={(e) => {
        e.preventDefault()
        if (!url.trim()) return
        add.mutate(
          { boardId, video: url.trim() },
          {
            onSuccess: () => {
              toast.success("Saved")
              setUrl("")
            },
          },
        )
      }}
    >
      <InputGroup className="h-9 bg-background">
        <InputGroupAddon>
          <Link2 />
        </InputGroupAddon>
        <InputGroupInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste any YouTube video link" disabled={add.isPending} />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="default" size="sm" disabled={!url.trim() || add.isPending}>
            {add.isPending && <Loader2 className="animate-spin" />}
            Save
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
