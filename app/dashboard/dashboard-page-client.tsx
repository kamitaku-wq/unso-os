"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Receipt, TrendingDown, TrendingUp, Truck } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, getErrorMessage } from "@/lib/format"

// ---- 型定義 ----

type PendingCounts = {
  billables: number
  expenses: number
  attendances: number
}

type MonthlyAmount = {
  ym: string
  amount: number
}

type EmployeeSummary = {
  emp_id: string
  name: string
  count: number
  amount: number
}

type MonthlyKpi = {
  sales: { current: number; prev: number; change: number | null }
  expenses: { current: number; prev: number; change: number | null }
  profit: { current: number; prev: number; change: number | null; rate: number }
}

type UnbilledAmount = {
  amount: number
  count: number
}

type CategoryBreakdown = {
  name: string
  amount: number
}

type AttendanceSummary = {
  totalWorkHours: number
  totalOvertimeHours: number
  activeEmployees: number
  approvedCount: number
}

type DashboardResponse = {
  pendingCounts: PendingCounts
  monthlySales: MonthlyAmount[]
  monthlyExpenses: MonthlyAmount[]
  currentMonthByEmployee: EmployeeSummary[]
  monthlyKpi: MonthlyKpi
  unbilledAmount: UnbilledAmount
  expenseCategoryBreakdown: CategoryBreakdown[]
  attendanceSummary: AttendanceSummary
}

type PeriodMonths = 3 | 6

// ---- 定数 ----

const EMPTY_DASHBOARD: DashboardResponse = {
  pendingCounts: { billables: 0, expenses: 0, attendances: 0 },
  monthlySales: [],
  monthlyExpenses: [],
  currentMonthByEmployee: [],
  monthlyKpi: {
    sales: { current: 0, prev: 0, change: null },
    expenses: { current: 0, prev: 0, change: null },
    profit: { current: 0, prev: 0, change: null, rate: 0 },
  },
  unbilledAmount: { amount: 0, count: 0 },
  expenseCategoryBreakdown: [],
  attendanceSummary: { totalWorkHours: 0, totalOvertimeHours: 0, activeEmployees: 0, approvedCount: 0 },
}

// ---- ユーティリティ ----

function formatMonthLabel(ym: string) {
  if (!/^\d{6}$/.test(ym)) return ym
  // スマホでも収まるよう「M月」形式（例: 3月, 12月）
  return `${parseInt(ym.slice(4, 6))}月`
}

// ---- サブコンポーネント: 前月比インジケーター ----

function ChangeBadge({ change, inverse = false }: { change: number | null; inverse?: boolean }) {
  if (change === null) return <span className="text-xs text-muted-foreground">前月比 -</span>

  const isPositive = change > 0
  const isGood = inverse ? !isPositive : isPositive
  const Icon = isPositive ? TrendingUp : TrendingDown
  const colorClass =
    change === 0 ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-500"

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="size-3" />
      {change > 0 ? "+" : ""}{change}%
    </span>
  )
}

// ---- サブコンポーネント: KPI カード ----

function KpiCard({
  title,
  value,
  subValue,
  change,
  inverseChange = false,
  colorScheme,
  badge,
}: {
  title: string
  value: string
  subValue?: string
  change: number | null
  inverseChange?: boolean
  colorScheme: "blue" | "orange" | "emerald" | "purple"
  badge?: string
}) {
  const schemes = {
    blue: { border: "border-l-4 border-l-blue-400", bg: "bg-blue-50/60", title: "text-blue-700", value: "text-blue-900" },
    orange: { border: "border-l-4 border-l-orange-400", bg: "bg-orange-50/60", title: "text-orange-700", value: "text-orange-900" },
    emerald: { border: "border-l-4 border-l-emerald-400", bg: "bg-emerald-50/60", title: "text-emerald-700", value: "text-emerald-900" },
    purple: { border: "border-l-4 border-l-purple-400", bg: "bg-purple-50/60", title: "text-purple-700", value: "text-purple-900" },
  }
  const s = schemes[colorScheme]

  return (
    <Card className={`${s.border} ${s.bg} shadow-sm`}>
      <CardContent className="px-5 pb-4 pt-5">
        <p className={`text-xs font-semibold uppercase tracking-wider ${s.title}`}>{title}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className={`text-2xl font-bold tracking-tight ${s.value}`}>{value}</p>
          {badge ? <Badge variant="secondary" className="shrink-0 text-xs">{badge}</Badge> : null}
        </div>
        {subValue ? <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p> : null}
        <div className="mt-3">
          <ChangeBadge change={change} inverse={inverseChange} />
        </div>
      </CardContent>
    </Card>
  )
}

// ---- サブコンポーネント: 月別棒グラフ ----

function MonthlyAmountChart({
  title,
  description,
  rows,
  barClassName,
  emptyIcon: EmptyIcon,
  emptyDescription,
}: {
  title: string
  description: string
  rows: MonthlyAmount[]
  barClassName: string
  emptyIcon: typeof Truck
  emptyDescription: string
}) {
  const maxAmount = rows.reduce((max, row) => Math.max(max, row.amount), 0)
  const chartHeight = 180
  const chartWidth = 420
  const leftPadding = 16
  const rightPadding = 16
  const topPadding = 12
  const bottomPadding = 24
  const innerHeight = chartHeight - topPadding - bottomPadding
  const usableWidth = chartWidth - leftPadding - rightPadding
  const step = rows.length > 0 ? usableWidth / rows.length : usableWidth
  const barWidth = Math.min(36, Math.max(20, step * 0.55))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={EmptyIcon} description={emptyDescription} />
        ) : (
          <div className="rounded-xl border bg-muted/20 p-4">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-48 w-full"
              role="img"
              aria-label={`${title}の棒グラフ`}
            >
              {[0, 1, 2, 3].map((line) => {
                const y = topPadding + (innerHeight / 3) * line
                return (
                  <line
                    key={line}
                    x1={leftPadding}
                    y1={y}
                    x2={chartWidth - rightPadding}
                    y2={y}
                    className="stroke-border"
                    strokeDasharray="4 4"
                  />
                )
              })}
              {rows.map((row, index) => {
                const ratio = maxAmount > 0 ? row.amount / maxAmount : 0
                const barHeight = Math.max(0, innerHeight * ratio)
                const x = leftPadding + step * index + (step - barWidth) / 2
                const y = chartHeight - bottomPadding - barHeight
                return (
                  <g key={row.ym}>
                    <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" className={barClassName} />
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 7}
                      textAnchor="middle"
                      fontSize={11}
                      fill="currentColor"
                      className="text-muted-foreground"
                    >
                      {formatMonthLabel(row.ym)}
                    </text>
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

// ---- サブコンポーネント: 経費区分別横棒グラフ ----

function ExpenseCategoryChart({ rows, isLoading, includeAll }: { rows: CategoryBreakdown[]; isLoading: boolean; includeAll: boolean }) {
  const max = rows.reduce((m, r) => Math.max(m, r.amount), 0)
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const colors = ["bg-orange-400", "bg-amber-400", "bg-yellow-400", "bg-orange-300", "bg-amber-300"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>当月 経費区分別内訳</CardTitle>
        <CardDescription>{includeAll ? "全ステータス経費の区分別集計（上位5件）" : "承認済み・支払済み経費の区分別集計（上位5件）"}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} description={includeAll ? "当月の経費がありません" : "当月の承認済み経費がありません"} />
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => {
              const pct = max > 0 ? Math.round((row.amount / max) * 100) : 0
              const totalPct = total > 0 ? Math.round((row.amount / total) * 100) : 0
              return (
                <div key={row.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(row.amount)}
                      <span className="ml-1 text-xs">({totalPct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors[i] ?? "bg-orange-400"}`}
                      style={{ width: `${pct}%` }}
                    />
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

// ---- メインページ ----

export default function DashboardPageClient() {
  const [dashboard, setDashboard] = useState<DashboardResponse>(EMPTY_DASHBOARD)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [periodMonths, setPeriodMonths] = useState<PeriodMonths>(6)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [includeAll, setIncludeAll] = useState(false)

  const currentMonthByEmployee = useMemo(() => {
    return [...dashboard.currentMonthByEmployee].sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      if (b.count !== a.count) return b.count - a.count
      return a.emp_id.localeCompare(b.emp_id)
    })
  }, [dashboard.currentMonthByEmployee])

  useEffect(() => {
    if (pageError) toast.error(pageError)
  }, [pageError])

  useEffect(() => {
    if (hasNoPermission) toast.error("権限がありません")
  }, [hasNoPermission])

  const loadDashboard = useCallback(async (all?: boolean) => {
    setIsLoading(true)
    setPageError("")

    try {
      const qs = (all ?? includeAll) ? "?includeAll=1" : ""
      const response = await fetch(`/api/dashboard${qs}`, { cache: "no-store" })
      const data = (await response.json()) as DashboardResponse | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setDashboard(EMPTY_DASHBOARD)
        setLastUpdatedAt(null)
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "ダッシュボードの取得に失敗しました"))
      }

      setHasNoPermission(false)
      setDashboard(data as DashboardResponse)
      setLastUpdatedAt(new Date().toISOString())
    } catch (error) {
      const message = error instanceof Error ? error.message : "ダッシュボードの取得に失敗しました"
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const filteredMonthlySales = useMemo(
    () => dashboard.monthlySales.slice(-periodMonths),
    [dashboard.monthlySales, periodMonths]
  )

  const filteredMonthlyExpenses = useMemo(
    () => dashboard.monthlyExpenses.slice(-periodMonths),
    [dashboard.monthlyExpenses, periodMonths]
  )

  const monthlyComparisonRows = useMemo(() => {
    return filteredMonthlySales.map((salesRow, index) => {
      const expenseRow = filteredMonthlyExpenses[index]
      const salesAmount = salesRow.amount
      const expenseAmount = expenseRow?.amount ?? 0
      return { ym: salesRow.ym, salesAmount, expenseAmount, estimatedProfit: salesAmount - expenseAmount }
    })
  }, [filteredMonthlyExpenses, filteredMonthlySales])

  const pendingCards = [
    { key: "billables", title: "運行実績", description: "承認管理へ移動", count: dashboard.pendingCounts.billables, href: "/admin?tab=billables" },
    { key: "expenses", title: "経費", description: "経費承認タブへ移動", count: dashboard.pendingCounts.expenses, href: "/admin?tab=expenses" },
    { key: "attendances", title: "勤怠", description: "勤怠承認画面へ移動", count: dashboard.pendingCounts.attendances, href: "/admin/attendances" },
  ] as const

  const kpi = dashboard.monthlyKpi

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">

        {/* ページヘッダー */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">経営ダッシュボード</h1>
            <p className="text-sm text-muted-foreground">
              当月の経営状況・承認状況・勤怠状況をリアルタイムで確認できます。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm shadow-sm">
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(e) => {
                  setIncludeAll(e.target.checked)
                  void loadDashboard(e.target.checked)
                }}
                className="size-4 accent-orange-500"
              />
              <span className="text-muted-foreground">未承認を含む</span>
            </label>
            <p className="text-xs text-muted-foreground">
              {lastUpdatedAt ? `更新: ${new Date(lastUpdatedAt).toLocaleString("ja-JP")}` : "更新: -"}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={isLoading}>
              {isLoading ? "更新中..." : "再読み込み"}
            </Button>
          </div>
        </div>

        {hasNoPermission ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">この画面を表示する権限がありません。</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ① 当月 KPI カード */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">当月 KPI</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title={includeAll ? "売上（全ステータス）" : "売上（承認済み）"}
                  value={isLoading ? "---" : formatCurrency(kpi.sales.current)}
                  subValue={isLoading ? undefined : `前月: ${formatCurrency(kpi.sales.prev)}`}
                  change={isLoading ? null : kpi.sales.change}
                  colorScheme="blue"
                />
                <KpiCard
                  title={includeAll ? "経費（全ステータス）" : "経費（承認済み）"}
                  value={isLoading ? "---" : formatCurrency(kpi.expenses.current)}
                  subValue={isLoading ? undefined : `前月: ${formatCurrency(kpi.expenses.prev)}`}
                  change={isLoading ? null : kpi.expenses.change}
                  inverseChange
                  colorScheme="orange"
                />
                <KpiCard
                  title="利益概算"
                  value={isLoading ? "---" : formatCurrency(kpi.profit.current)}
                  subValue={isLoading ? undefined : `前月: ${formatCurrency(kpi.profit.prev)}`}
                  change={isLoading ? null : kpi.profit.change}
                  badge={isLoading ? undefined : `利益率 ${kpi.profit.rate}%`}
                  colorScheme="emerald"
                />
                <KpiCard
                  title="未請求残高"
                  value={isLoading ? "---" : formatCurrency(dashboard.unbilledAmount.amount)}
                  subValue={isLoading ? undefined : `${dashboard.unbilledAmount.count} 件の承認済み運行実績`}
                  change={null}
                  badge={!isLoading && dashboard.unbilledAmount.count > 0 ? "請求書未発行" : undefined}
                  colorScheme="purple"
                />
              </div>
            </section>

            {/* ② 勤怠サマリー */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">当月 勤怠サマリー</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "承認済み勤怠", value: isLoading ? "---" : `${dashboard.attendanceSummary.approvedCount} 件`, sub: "当月の承認済み勤怠記録数" },
                  { label: "稼働社員数", value: isLoading ? "---" : `${dashboard.attendanceSummary.activeEmployees} 名`, sub: "勤怠記録のある社員" },
                  { label: "総勤務時間", value: isLoading ? "---" : `${dashboard.attendanceSummary.totalWorkHours} h`, sub: "承認済み分の合計" },
                  { label: "総残業時間", value: isLoading ? "---" : `${dashboard.attendanceSummary.totalOvertimeHours} h`, sub: "8 時間超の合計" },
                ].map((item) => (
                  <Card key={item.label} className="border-l-4 border-l-slate-300 bg-slate-50/60 shadow-sm">
                    <CardContent className="px-5 pb-4 pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{item.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* ③ 承認待ち */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">承認待ち</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {pendingCards.map((card) => (
                  <Link key={card.key} href={card.href} className="block">
                    <Card
                      className={[
                        "h-full cursor-pointer transition-colors hover:border-primary/50",
                        card.count > 0
                          ? "border-orange-300 bg-orange-50 hover:bg-orange-100"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <CardHeader className="gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>{card.title}</CardTitle>
                            <CardDescription>{card.description}</CardDescription>
                          </div>
                          <Badge
                            variant="outline"
                            className={card.count > 0 ? "border-orange-400 bg-white text-orange-700" : "border-muted-foreground/30 bg-muted text-muted-foreground"}
                          >
                            {isLoading ? "..." : `${card.count} 件`}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-semibold tracking-tight">{isLoading ? "--" : card.count}</div>
                        <p className="text-sm text-muted-foreground">クリックして確認</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            {/* ④ 月別グラフ */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">月別推移</h2>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={periodMonths === 3 ? "default" : "outline"} onClick={() => setPeriodMonths(3)} disabled={isLoading}>3 ヶ月</Button>
                  <Button type="button" size="sm" variant={periodMonths === 6 ? "default" : "outline"} onClick={() => setPeriodMonths(6)} disabled={isLoading}>6 ヶ月</Button>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <MonthlyAmountChart
                  title="月別売上"
                  description={includeAll ? `全ステータス運行実績の直近 ${periodMonths} ヶ月集計` : `承認済み運行実績の直近 ${periodMonths} ヶ月集計`}
                  rows={filteredMonthlySales}
                  barClassName="fill-blue-500"
                  emptyIcon={Truck}
                  emptyDescription="運行実績を登録してください"
                />
                <MonthlyAmountChart
                  title="月別経費"
                  description={includeAll ? `全ステータス経費の直近 ${periodMonths} ヶ月集計` : `承認済み・支払済み経費の直近 ${periodMonths} ヶ月集計`}
                  rows={filteredMonthlyExpenses}
                  barClassName="fill-orange-400"
                  emptyIcon={Receipt}
                  emptyDescription="経費申請を登録してください"
                />
              </div>
            </section>

            {/* ⑤ 月別比較 + 経費区分内訳 */}
            <section className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>月別比較</CardTitle>
                  <CardDescription>売上・経費・利益概算の推移</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyComparisonRows.length === 0 ? (
                    <EmptyState icon={Receipt} description="売上または経費データを登録してください" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>月</TableHead>
                          <TableHead className="text-right">売上</TableHead>
                          <TableHead className="text-right">経費</TableHead>
                          <TableHead className="text-right">利益概算</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyComparisonRows.map((row) => (
                          <TableRow key={row.ym}>
                            <TableCell>{formatMonthLabel(row.ym)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-700">
                              {formatCurrency(row.salesAmount)}
                            </TableCell>
                            <TableCell className="text-right text-orange-700">
                              {formatCurrency(row.expenseAmount)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${row.estimatedProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                              {formatCurrency(row.estimatedProfit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <ExpenseCategoryChart rows={dashboard.expenseCategoryBreakdown} isLoading={isLoading} includeAll={includeAll} />
            </section>

            {/* ⑥ 社員別実績 */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>当月 社員別実績</CardTitle>
                  <CardDescription>当月に登録された運行実績の件数と承認済み金額を社員別に表示します。</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TableSkeleton columns={4} rows={4} />
                  ) : currentMonthByEmployee.length === 0 ? (
                    <EmptyState icon={Truck} description="当月の運行実績がありません" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>社員名</TableHead>
                          <TableHead>社員ID</TableHead>
                          <TableHead className="text-right">件数</TableHead>
                          <TableHead className="text-right">承認済み金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentMonthByEmployee.map((row) => (
                          <TableRow key={row.emp_id}>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            <TableCell className="text-muted-foreground">{row.emp_id}</TableCell>
                            <TableCell className="text-right">{row.count}</TableCell>
                            <TableCell className="text-right font-semibold text-blue-700">
                              {formatCurrency(row.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
