// 全ページ共通のレイアウトラッパー（min-h-screen + max-w-7xl）
import { cn } from "@/lib/utils"

type Props = {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: Props) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6", className)}>
        {children}
      </div>
    </main>
  )
}
