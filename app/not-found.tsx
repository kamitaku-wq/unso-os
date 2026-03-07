import Link from "next/link"
import { Truck } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8 md:px-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
          <Truck className="size-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">ページが見つかりません</h1>
          <p className="text-sm text-muted-foreground">
            URL が間違っているか、ページが移動された可能性があります。
          </p>
        </div>
        <Button asChild>
          <Link href="/">トップに戻る</Link>
        </Button>
      </div>
    </main>
  )
}
