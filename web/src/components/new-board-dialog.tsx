import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateBoard, useUpdateBoard, type Board } from "@/lib/api"

/** Create a board, or edit one when `board` is given. */
export function NewBoardDialog({
  open,
  onOpenChange,
  onCreated,
  board,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (board: Board) => void
  board?: Pick<Board, "id" | "name" | "description">
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const create = useCreateBoard()
  const update = useUpdateBoard(board?.id ?? 0)
  const pending = create.isPending || update.isPending

  useEffect(() => {
    if (open) {
      setName(board?.name ?? "")
      setDescription(board?.description ?? "")
    }
  }, [open, board])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (board) {
      await update.mutateAsync({ name, description })
    } else {
      const created = await create.mutateAsync({ name, description })
      onCreated?.(created)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{board ? "Edit board" : "New board"}</DialogTitle>
            <DialogDescription>
              {board ? "Rename this board or change what it's for." : "Group videos you want to learn from: hooks, thumbnails, formats."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="board-name">Name</Label>
            <Input id="board-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Great hooks" autoFocus />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="board-desc">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="board-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you collecting here?"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || pending}>
              {board ? "Save" : "Create board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
