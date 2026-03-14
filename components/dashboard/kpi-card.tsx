"use client"

import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

// 前月比インジケーター
export function ChangeBadge({ change, inverse = false }: { change: number | null; inverse?: boolean }) {
  if (change === null) return <span className="text-xs text-muted-foreground">前月比 -</span>
  const isPositive = change > 0
  const isGood = inverse ? !isPositive : isPositive
  const Icon = isPositive ? TrendingUp : TrendingDown
  const colorClass = change === 0 ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-500"
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="size-3" />
      {change > 0 ? "+" : ""}{change}%
    </span>
  )
}

// KPI カード
export function KpiCard({
  title, value, subValue, change, inverseChange = false, colorScheme, badge,
}: {
  title: string; value: string; subValue?: string; change: number | null
  inverseChange?: boolean; colorScheme: "blue" | "orange" | "emerald" | "purple" | "slate" | "amber"
  badge?: string
}) {
  const schemes = {
    blue: { border: "border-l-blue-400", bg: "bg-blue-50/60", title: "text-blue-700", value: "text-blue-900" },
    orange: { border: "border-l-orange-400", bg: "bg-orange-50/60", title: "text-orange-700", value: "text-orange-900" },
    emerald: { border: "border-l-emerald-400", bg: "bg-emerald-50/60", title: "text-emerald-700", value: "text-emerald-900" },
    purple: { border: "border-l-purple-400", bg: "bg-purple-50/60", title: "text-purple-700", value: "text-purple-900" },
    slate: { border: "border-l-slate-400", bg: "bg-slate-50/60", title: "text-slate-700", value: "text-slate-900" },
    amber: { border: "border-l-amber-400", bg: "bg-amber-50/60", title: "text-amber-700", value: "text-amber-900" },
  }
  const s = schemes[colorScheme]
  return (
    <Card className={`border-l-4 ${s.border} ${s.bg} shadow-sm`}>
      <CardContent className="px-5 pb-4 pt-5">
        <p className={`text-xs font-semibold uppercase tracking-wider ${s.title}`}>{title}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className={`text-2xl font-bold tracking-tight ${s.value}`}>{value}</p>
          {badge ? <Badge variant="secondary" className="shrink-0 text-xs">{badge}</Badge> : null}
        </div>
        {subValue ? <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p> : null}
        <div className="mt-3"><ChangeBadge change={change} inverse={inverseChange} /></div>
      </CardContent>
    </Card>
  )
}
