import { useState, type ReactNode } from "react"
import { Check, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useBoardItem, useBoards, useCreateBoard } from "@/lib/api"

/** Popover to add or remove a video from boards, or create a board on the fly. */
export function SaveMenu({
  videoId,
  boardIds,
  children,
  align = "end",
}: {
  videoId: string
  boardIds: number[]
  children: ReactNode
  align?: "start" | "end"
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data: boards = [] } = useBoards()
  const item = useBoardItem()
  const create = useCreateBoard()
  const saved = new Set(boardIds)

  const toggle = (id: number, name: string) => {
    const remove = saved.has(id)
    item.mutate(
      { boardId: id, video: videoId, remove },
      { onSuccess: () => toast.success(remove ? `Removed from ${name}` : `Saved to ${name}`) },
    )
  }

  const createAndSave = async () => {
    const name = search.trim()
    if (!name) return
    const board = await create.mutateAsync({ name })
    item.mutate({ boardId: board.id, video: videoId }, { onSuccess: () => toast.success(`Saved to ${board.name}`) })
    setSearch("")
    setOpen(false)
  }

  const exact = boards.some((b) => b.name.toLowerCase() === search.trim().toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align={align} onClick={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Find or create board…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">No boards found</CommandEmpty>
            {boards.length > 0 && (
              <CommandGroup heading="Save to">
                {boards.map((b) => (
                  <CommandItem key={b.id} value={b.name} onSelect={() => toggle(b.id, b.name)}>
                    <span className="flex-1 truncate">{b.name}</span>
                    {saved.has(b.id) && <Check className="text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search.trim() && !exact && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value={`create-${search}`} onSelect={createAndSave}>
                    <Plus />
                    Create “{search.trim()}”
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
