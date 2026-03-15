// 管理画面上部に表示する当月KPIサマリーバー
"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/format"

type KpiData = {
  sales: number
  expenses: number
  profit: number
  pendingJobs: number
  pendingExpenses: number
}

// OWNER のみ表示。ダッシュボードに遷移せず概況を把握できる
export function KpiSummaryBar({ role }: { role: string | null }) {
  const [kpi, setKpi] = useState<KpiData | null>(null)

  useEffect(() => {
    if (role !== "OWNER") return
    fetch("/api/admin/kpi-summary")
      .then((r) => r.ok ? r.json() : null)
      .then((data: KpiData | null) => setKpi(data))
      .catch(() => {})
  }, [role])

  if (role !== "OWNER" || !kpi) return null

  const items = [
    { label: "当月売上", value: formatCurrency(kpi.sales), color: "text-blue-700" },
    { label: "当月経費", value: formatCurrency(kpi.expenses), color: "text-orange-700" },
    { label: "利益概算", value: formatCurrency(kpi.profit), color: kpi.profit >= 0 ? "text-emerald-700" : "text-red-600" },
    { label: "未承認作業", value: `${kpi.pendingJobs}件`, color: kpi.pendingJobs > 0 ? "text-amber-700" : "text-muted-foreground" },
    { label: "未承認経費", value: `${kpi.pendingExpenses}件`, color: kpi.pendingExpenses > 0 ? "text-amber-700" : "text-muted-foreground" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
          <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}
