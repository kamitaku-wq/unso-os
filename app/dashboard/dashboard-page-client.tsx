"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Receipt, Truck } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, getErrorMessage } from "@/lib/format"

import { HorizontalBarChart, MonthlyBarChart } from "@/components/dashboard/charts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { CleaningDashboard, type CleaningDashboardData } from "@/components/dashboard/cleaning-dashboard"
import { ClosingAlert } from "@/components/dashboard/closing-alert"

// ---- 運送業用の型定義 ----
type TransportDashboard = {
  industry: "transport"
  pendingCounts: { billables: number; expenses: number; attendances: number }
  monthlySales: { ym: string; amount: number }[]
  monthlyExpenses: { ym: string; amount: number }[]
  currentMonthByEmployee: { emp_id: string; name: string; count: number; amount: number }[]
  monthlyKpi: {
    sales: { current: number; prev: number; change: number | null }
    expenses: { current: number; prev: number; change: number | null }
    profit: { current: number; prev: number; change: number | null; rate: number }
  }
  unbilledAmount: { amount: number; count: number }
  expenseCategoryBreakdown: { name: string; amount: number }[]
  attendanceSummary: { totalWorkHours: number; totalOvertimeHours: number; activeEmployees: number; approvedCount: number }
}

type DashboardResponse = TransportDashboard | CleaningDashboardData
type PeriodMonths = 3 | 6 | 12

// ---- メインページ ----
export default function DashboardPageClient() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [periodMonths, setPeriodMonths] = useState<PeriodMonths>(6)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [includeAll, setIncludeAll] = useState(false)

  const loadDashboard = useCallback(async (all?: boolean) => {
    setIsLoading(true)
    try {
      const qs = (all ?? includeAll) ? "?includeAll=1" : ""
      const res = await fetch(`/api/dashboard${qs}`, { cache: "no-store" })
      if (res.status === 403) { setHasNoPermission(true); setDashboard(null); return }
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, "取得に失敗しました"))
      setHasNoPermission(false)
      setDashboard(data as DashboardResponse)
      setLastUpdatedAt(new Date().toISOString())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [includeAll])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {/* ヘッダー */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">経営ダッシュボード</h1>
            <p className="text-sm text-muted-foreground">当月の経営状況をリアルタイムで確認できます。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm shadow-sm">
              <input type="checkbox" checked={includeAll} onChange={e => { setIncludeAll(e.target.checked); void loadDashboard(e.target.checked) }} className="size-4 accent-orange-500" />
              <span className="text-muted-foreground">未承認を含む</span>
            </label>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant={periodMonths === 3 ? "default" : "outline"} onClick={() => setPeriodMonths(3)}>3ヶ月</Button>
              <Button type="button" size="sm" variant={periodMonths === 6 ? "default" : "outline"} onClick={() => setPeriodMonths(6)}>6ヶ月</Button>
              <Button type="button" size="sm" variant={periodMonths === 12 ? "default" : "outline"} onClick={() => setPeriodMonths(12)}>1年</Button>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={isLoading}>{isLoading ? "更新中..." : "再読み込み"}</Button>
            {lastUpdatedAt ? <p className="w-full text-xs text-muted-foreground sm:w-auto">更新: {new Date(lastUpdatedAt).toLocaleString("ja-JP")}</p> : null}
          </div>
        </div>

        <ClosingAlert />

        {hasNoPermission ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">この画面を表示する権限がありません。</p></CardContent></Card>
        ) : dashboard?.industry === "car_cleaning" ? (
          <CleaningDashboard data={dashboard} isLoading={isLoading} includeAll={includeAll} periodMonths={periodMonths} />
        ) : (
          <TransportDashboardView data={dashboard as TransportDashboard | null} isLoading={isLoading} includeAll={includeAll} periodMonths={periodMonths} />
        )}
      </div>
    </main>
  )
}

// ---- 運送業ダッシュボード ----
function TransportDashboardView({ data, isLoading, includeAll, periodMonths }: {
  data: TransportDashboard | null; isLoading: boolean; includeAll: boolean; periodMonths: number
}) {
  const d = data ?? {
    pendingCounts: { billables: 0, expenses: 0, attendances: 0 },
    monthlySales: [], monthlyExpenses: [], currentMonthByEmployee: [],
    monthlyKpi: { sales: { current: 0, prev: 0, change: null }, expenses: { current: 0, prev: 0, change: null }, profit: { current: 0, prev: 0, change: null, rate: 0 } },
    unbilledAmount: { amount: 0, count: 0 }, expenseCategoryBreakdown: [],
    attendanceSummary: { totalWorkHours: 0, totalOvertimeHours: 0, activeEmployees: 0, approvedCount: 0 },
  }

  const sales = useMemo(() => d.monthlySales.slice(-periodMonths), [d.monthlySales, periodMonths])
  const expenses = useMemo(() => d.monthlyExpenses.slice(-periodMonths), [d.monthlyExpenses, periodMonths])
  const employees = useMemo(() => [...d.currentMonthByEmployee].sort((a, b) => b.amount - a.amount || b.count - a.count), [d.currentMonthByEmployee])

  const comparisonRows = useMemo(() => sales.map((s, i) => {
    const e = expenses[i]?.amount ?? 0
    return { ym: s.ym, sales: s.amount, expenses: e, profit: s.amount - e }
  }), [sales, expenses])

  const kpi = d.monthlyKpi
  const pendingCards = [
    { key: "billables", title: "運行実績", count: d.pendingCounts.billables, href: "/admin?tab=billables" },
    { key: "expenses", title: "経費", count: d.pendingCounts.expenses, href: "/admin?tab=expenses" },
    { key: "attendances", title: "勤怠", count: d.pendingCounts.attendances, href: "/admin?tab=attendances" },
  ]

  return (
    <>
      {/* KPI */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">当月 KPI</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={includeAll ? "売上（全）" : "売上（承認済み）"} value={isLoading ? "---" : formatCurrency(kpi.sales.current)}
            subValue={isLoading ? undefined : `前月同日: ${formatCurrency(kpi.sales.prev)}`} change={isLoading ? null : kpi.sales.change} colorScheme="blue" />
          <KpiCard title={includeAll ? "経費（全）" : "経費（承認済み）"} value={isLoading ? "---" : formatCurrency(kpi.expenses.current)}
            subValue={isLoading ? undefined : `前月同日: ${formatCurrency(kpi.expenses.prev)}`} change={isLoading ? null : kpi.expenses.change} inverseChange colorScheme="orange" />
          <KpiCard title="利益概算" value={isLoading ? "---" : formatCurrency(kpi.profit.current)}
            subValue={isLoading ? undefined : `前月同日: ${formatCurrency(kpi.profit.prev)}`} change={isLoading ? null : kpi.profit.change}
            badge={isLoading ? undefined : `利益率 ${kpi.profit.rate}%`} colorScheme="emerald" />
          <Link href="/invoice" className="block">
            <KpiCard title="未請求残高" value={isLoading ? "---" : formatCurrency(d.unbilledAmount.amount)}
              subValue={isLoading ? undefined : `${d.unbilledAmount.count} 件`} change={null}
              badge={!isLoading && d.unbilledAmount.count > 0 ? "未発行" : undefined} colorScheme="purple" />
          </Link>
        </div>
      </section>

      {/* 勤怠サマリー */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">当月 勤怠サマリー</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "承認済み勤怠", value: `${d.attendanceSummary.approvedCount} 件` },
            { label: "稼働社員数", value: `${d.attendanceSummary.activeEmployees} 名` },
            { label: "総勤務時間", value: `${d.attendanceSummary.totalWorkHours} h` },
            { label: "総残業時間", value: `${d.attendanceSummary.totalOvertimeHours} h` },
          ].map(item => (
            <Card key={item.label} className="border-l-4 border-l-slate-300 bg-slate-50/60 shadow-sm">
              <CardContent className="px-5 pb-4 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{item.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{isLoading ? "---" : item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 承認待ち */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">承認待ち</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {pendingCards.map(c => (
            <Link key={c.key} href={c.href} className="block">
              <Card className={`h-full cursor-pointer transition-colors hover:border-primary/50 ${c.count > 0 ? "border-orange-300 bg-orange-50" : "bg-muted/30 text-muted-foreground"}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{c.title}</CardTitle>
                    <Badge variant="outline" className={c.count > 0 ? "border-orange-400 bg-white text-orange-700" : ""}>{isLoading ? "..." : `${c.count} 件`}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{isLoading ? "--" : c.count}</div>
                  <p className="text-sm text-muted-foreground">{c.count > 0 ? "クリックして確認" : "すべて承認済み"}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 月別グラフ */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">月別推移</h2>
        <div className="grid gap-6 xl:grid-cols-2">
          <MonthlyBarChart title="月別売上" description={`直近 ${periodMonths} ヶ月`} rows={sales} barClassName="fill-blue-500" emptyIcon={Truck} emptyDescription="運行実績を登録してください" />
          <MonthlyBarChart title="月別経費" description={`直近 ${periodMonths} ヶ月`} rows={expenses} barClassName="fill-orange-400" emptyIcon={Receipt} emptyDescription="経費を登録してください" />
        </div>
      </section>

      {/* 月別比較 + 経費区分 */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>月別比較</CardTitle><CardDescription>売上・経費・利益概算の推移</CardDescription></CardHeader>
          <CardContent>
            {comparisonRows.length === 0 ? <EmptyState icon={Receipt} description="データがありません" /> : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>月</TableHead><TableHead className="text-right">売上</TableHead>
                    <TableHead className="text-right">経費</TableHead><TableHead className="text-right">利益概算</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {comparisonRows.map(r => (
                      <TableRow key={r.ym}>
                        <TableCell>{parseInt(r.ym.slice(4, 6))}月</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-medium text-blue-700">{formatCurrency(r.sales)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-orange-700">{formatCurrency(r.expenses)}</TableCell>
                        <TableCell className={`whitespace-nowrap text-right font-semibold ${r.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(r.profit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <HorizontalBarChart title="経費区分別（当月）" description={includeAll ? "全ステータス" : "承認済みのみ"} rows={d.expenseCategoryBreakdown}
          colors={["bg-orange-400", "bg-amber-400", "bg-yellow-400", "bg-orange-300", "bg-amber-300"]}
          emptyIcon={Receipt} emptyDescription="当月の経費がありません" isLoading={isLoading} />
      </section>

      {/* 社員別実績 */}
      <section>
        <Card>
          <CardHeader><CardTitle>当月 社員別実績</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton columns={4} rows={4} /> : employees.length === 0 ? <EmptyState icon={Truck} description="当月の実績がありません" /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>社員名</TableHead><TableHead className="text-right">件数</TableHead><TableHead className="text-right">承認済み金額</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {employees.map(r => (
                    <TableRow key={r.emp_id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">{formatCurrency(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
