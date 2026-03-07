"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock, Receipt, Truck } from "lucide-react"
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
  count: number
  amount: number
}

type DashboardResponse = {
  pendingCounts: PendingCounts
  monthlySales: MonthlyAmount[]
  monthlyExpenses: MonthlyAmount[]
  currentMonthByEmployee: EmployeeSummary[]
}

type PeriodMonths = 3 | 6

const EMPTY_DASHBOARD: DashboardResponse = {
  pendingCounts: {
    billables: 0,
    expenses: 0,
    attendances: 0,
  },
  monthlySales: [],
  monthlyExpenses: [],
  currentMonthByEmployee: [],
}

function getErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error
  }

  return fallback
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonthLabel(ym: string) {
  if (!/^\d{6}$/.test(ym)) return ym
  return `${ym.slice(0, 4)}/${ym.slice(4, 6)}`
}

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
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-64 w-full"
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
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="6"
                        className={barClassName}
                      />
                      <text
                        x={x + barWidth / 2}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[10px]"
                      >
                        {formatMonthLabel(row.ym)}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.ym}>
                    <TableCell>{formatMonthLabel(row.ym)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse>(EMPTY_DASHBOARD)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [periodMonths, setPeriodMonths] = useState<PeriodMonths>(6)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)

  const currentMonthByEmployee = useMemo(() => {
    return [...dashboard.currentMonthByEmployee].sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      if (b.count !== a.count) return b.count - a.count
      return a.emp_id.localeCompare(b.emp_id)
    })
  }, [dashboard.currentMonthByEmployee])

  useEffect(() => {
    if (pageError) {
      toast.error(pageError)
    }
  }, [pageError])

  useEffect(() => {
    if (hasNoPermission) {
      toast.error("権限がありません")
    }
  }, [hasNoPermission])

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setPageError("")

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" })
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
      const message =
        error instanceof Error ? error.message : "ダッシュボードの取得に失敗しました"
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const filteredMonthlySales = useMemo(() => {
    return dashboard.monthlySales.slice(-periodMonths)
  }, [dashboard.monthlySales, periodMonths])

  const filteredMonthlyExpenses = useMemo(() => {
    return dashboard.monthlyExpenses.slice(-periodMonths)
  }, [dashboard.monthlyExpenses, periodMonths])

  const pendingCards = [
    {
      key: "billables",
      title: "運行実績",
      description: "承認管理へ移動",
      count: dashboard.pendingCounts.billables,
      href: "/admin",
    },
    {
      key: "expenses",
      title: "経費",
      description: "経費承認タブへ移動",
      count: dashboard.pendingCounts.expenses,
      href: "/admin?tab=expenses",
    },
    {
      key: "attendances",
      title: "勤怠",
      description: "勤怠承認画面へ移動",
      count: dashboard.pendingCounts.attendances,
      href: "/admin/attendances",
    },
  ] as const

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">経営ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            承認待ちの状況と直近 6 ヶ月の推移、当月の社員別実績を確認できます。
          </p>
        </div>

        {hasNoPermission ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                この画面を表示する権限がありません。
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="gap-4">
                <div>
                  <CardTitle>表示設定</CardTitle>
                  <CardDescription>
                    月別グラフの表示期間を切り替えたり、最新データを再取得したりできます。
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={periodMonths === 3 ? "default" : "outline"}
                      onClick={() => setPeriodMonths(3)}
                      disabled={isLoading}
                    >
                      直近 3 ヶ月
                    </Button>
                    <Button
                      type="button"
                      variant={periodMonths === 6 ? "default" : "outline"}
                      onClick={() => setPeriodMonths(6)}
                      disabled={isLoading}
                    >
                      直近 6 ヶ月
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">
                      {lastUpdatedAt
                        ? `最終更新: ${new Date(lastUpdatedAt).toLocaleString("ja-JP")}`
                        : "最終更新: -"}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadDashboard()}
                      disabled={isLoading}
                    >
                      {isLoading ? "更新中..." : "再読み込み"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <section className="grid gap-4 md:grid-cols-3">
              {pendingCards.map((card) => (
                <Card key={card.key}>
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{card.title}</CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </div>
                      <Badge variant={card.count > 0 ? "destructive" : "secondary"}>
                        {isLoading ? "..." : `${card.count} 件`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-semibold tracking-tight">
                        {isLoading ? "--" : card.count}
                      </div>
                      <p className="text-sm text-muted-foreground">承認待ち</p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={card.href}>確認する</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <MonthlyAmountChart
                title="月別売上"
                description={`承認済み運行実績の直近 ${periodMonths} ヶ月集計です。`}
                rows={filteredMonthlySales}
                barClassName="fill-primary"
                emptyIcon={Truck}
                emptyDescription="上のフォームから最初の運行実績を登録してください"
              />
              <MonthlyAmountChart
                title="月別経費"
                description={`承認済み・支払済み経費の直近 ${periodMonths} ヶ月集計です。`}
                rows={filteredMonthlyExpenses}
                barClassName="fill-emerald-500"
                emptyIcon={Receipt}
                emptyDescription="上のフォームから最初の経費申請を登録してください"
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle>当月 社員別実績</CardTitle>
                <CardDescription>
                  当月に登録された運行実績の件数と、承認済み金額を社員別に表示します。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableSkeleton columns={3} rows={4} />
                ) : currentMonthByEmployee.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    description="上のフォームから最初の運行実績を登録してください"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>社員ID</TableHead>
                        <TableHead className="text-right">件数</TableHead>
                        <TableHead className="text-right">承認済み金額</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMonthByEmployee.map((row) => (
                        <TableRow key={row.emp_id}>
                          <TableCell>{row.emp_id}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
