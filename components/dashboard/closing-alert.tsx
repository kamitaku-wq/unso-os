// 月次締め期限アラート（月末5日前からダッシュボードに表示）
"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"

// 月末までの残り日数を計算する
function getDaysUntilMonthEnd(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate()
}

export function ClosingAlert() {
  const [closingStatus, setClosingStatus] = useState<{ closed: boolean } | null>(null)
  const daysLeft = getDaysUntilMonthEnd()

  useEffect(() => {
    if (daysLeft > 5) return
    const ym = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`
    fetch(`/api/closing-status?ym=${ym}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { closed?: boolean } | null) => {
        if (data) setClosingStatus({ closed: Boolean(data.closed) })
      })
      .catch(() => {})
  }, [daysLeft])

  // 月末まで5日以上、または既に締め済みなら非表示
  if (daysLeft > 5 || closingStatus?.closed) return null

  return (
    <Link href="/admin?tab=closings" className="block">
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="flex items-center gap-3 px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              月末まであと{daysLeft}日 — 月次締めが未実施です
            </p>
            <p className="text-xs text-amber-600">
              クリックして月次締め画面を開きます。未承認の実績・経費がないか確認してください。
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
