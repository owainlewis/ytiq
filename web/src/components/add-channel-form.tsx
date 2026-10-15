import { useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { useAddChannel } from "@/lib/api"
import { cn } from "@/lib/utils"

export function AddChannelForm({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const [input, setInput] = useState("")
  const add = useAddChannel()

  return (
    <form
      className={cn("w-full", className)}
      onSubmit={(e) => {
        e.preventDefault()
        if (input.trim()) add.mutate(input.trim(), { onSuccess: () => setInput("") })
      }}
    >
      <InputGroup className="h-9 bg-background">
        <InputGroupInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="@handle, channel URL, or any video URL"
          autoFocus={autoFocus}
          disabled={add.isPending}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="default" size="sm" disabled={!input.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            {add.isPending ? "Adding" : "Add"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
