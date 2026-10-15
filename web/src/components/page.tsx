import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/** Sticky page header with title, description and right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="flex min-h-14 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator orientation="vertical" className="h-4 md:hidden" />
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
          {description && <p className="hidden truncate text-sm text-muted-foreground lg:block">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-6">{children}</div>}
    </header>
  )
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 py-6 md:px-6", className)}>{children}</div>
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center", className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex w-full max-w-md flex-col items-center gap-2">{children}</div>}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</h2>
}
