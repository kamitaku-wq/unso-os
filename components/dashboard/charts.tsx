"use client"

import type { LucideIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

type MonthlyAmount = { ym: string; amount: number }
type BreakdownRow = { name: string; amount: number }

function formatMonthLabel(ym: string) {
  if (!/^\d{6}$/.test(ym)) return ym
  return `${parseInt(ym.slice(4, 6))}月`
}

// 月別棒グラフ
export function MonthlyBarChart({
  title, description, rows, barClassName, emptyIcon: Icon, emptyDescription,
}: {
  title: string; description: string; rows: MonthlyAmount[]; barClassName: string
  emptyIcon: LucideIcon; emptyDescription: string
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.amount), 0)
  const W = 420; const H = 180; const L = 16; const R = 16; const T = 12; const B = 24
  const innerH = H - T - B; const usable = W - L - R
  const step = rows.length > 0 ? usable / rows.length : usable
  const bw = Math.min(36, Math.max(20, step * 0.55))

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <EmptyState icon={Icon} description={emptyDescription} /> : (
          <div className="rounded-xl border bg-muted/20 p-4">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" role="img" aria-label={`${title}の棒グラフ`}>
              {[0, 1, 2, 3].map(i => (
                <line key={i} x1={L} y1={T + (innerH / 3) * i} x2={W - R} y2={T + (innerH / 3) * i} className="stroke-border" strokeDasharray="4 4" />
              ))}
              {rows.map((r, i) => {
                const ratio = max > 0 ? r.amount / max : 0
                const bh = Math.max(0, innerH * ratio)
                const x = L + step * i + (step - bw) / 2
                return (
                  <g key={r.ym}>
                    <rect x={x} y={H - B - bh} width={bw} height={bh} rx="6" className={barClassName} />
                    <text x={x + bw / 2} y={H - 7} textAnchor="middle" fontSize={11} fill="currentColor" className="text-muted-foreground">{formatMonthLabel(r.ym)}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 横棒グラフ（内訳表示用）
export function HorizontalBarChart({
  title, description, rows, colors, emptyIcon: Icon, emptyDescription, isLoading = false,
}: {
  title: string; description: string; rows: BreakdownRow[]; colors: string[]
  emptyIcon: LucideIcon; emptyDescription: string; isLoading?: boolean
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.amount), 0)
  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => (<div key={i} className="space-y-1"><div className="h-3 w-24 animate-pulse rounded bg-muted" /><div className="h-2.5 w-full animate-pulse rounded-full bg-muted" /></div>))}</div>
        ) : rows.length === 0 ? <EmptyState icon={Icon} description={emptyDescription} /> : (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const pct = max > 0 ? Math.round((r.amount / max) * 100) : 0
              const totalPct = total > 0 ? Math.round((r.amount / total) * 100) : 0
              return (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(r.amount)}<span className="ml-1 text-xs">({totalPct}%)</span></span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all duration-500 ${colors[i] ?? colors[0]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
