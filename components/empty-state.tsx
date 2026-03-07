import type { LucideIcon } from "lucide-react"

export function EmptyState({
  icon: Icon,
  title = "まだデータがありません",
  description,
}: {
  icon: LucideIcon
  title?: string
  description: string
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
