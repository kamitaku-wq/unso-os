"use client"

// アプリ全体のエラーバウンダリ
// 子コンポーネントで予期せぬエラーが発生した場合に表示される
import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">エラーが発生しました</h1>
          <p className="text-sm text-muted-foreground">
            予期せぬエラーが発生しました。もう一度お試しください。
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            前のページへ
          </Button>
          <Button onClick={reset}>再試行</Button>
        </div>
      </div>
    </main>
  )
}
