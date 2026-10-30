import { useState } from "react"
import { CircleAlert, CircleCheck, Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { useSaveSettings, type KeyName, type KeyState } from "@/lib/api"

/** Paste a key, check it, save it. Shows what's saved without ever showing the full key. */
export function KeyField({
  name,
  state,
  placeholder,
  onSaved,
}: {
  name: KeyName
  state?: KeyState
  placeholder: string
  onSaved?: () => void
}) {
  const [value, setValue] = useState("")
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(false)
  const save = useSaveSettings()

  if (state?.set && !editing) {
    return (
      <div className="flex h-9 items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <code className="truncate text-muted-foreground">{state.preview}</code>
          {state.source === "env" && <span className="text-xs text-muted-foreground">from .env</span>}
        </span>
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!value.trim()) return
        save.mutate(
          { [name]: value.trim() },
          {
            onSuccess: () => {
              setValue("")
              setEditing(false)
              onSaved?.()
            },
          },
        )
      }}
    >
      <InputGroup className="h-9 bg-background">
        <InputGroupInput
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            save.reset()
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          disabled={save.isPending}
          aria-invalid={save.isError}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label={show ? "Hide key" : "Show key"} onClick={() => setShow(!show)}>
            {show ? <EyeOff /> : <Eye />}
          </InputGroupButton>
          <InputGroupButton type="submit" variant="default" size="sm" disabled={!value.trim() || save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {save.isPending ? "Checking" : "Save"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {save.isError && (
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {save.error.message}
        </p>
      )}
      {editing && (
        <button type="button" className="self-start text-xs text-muted-foreground hover:underline" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
    </form>
  )
}
