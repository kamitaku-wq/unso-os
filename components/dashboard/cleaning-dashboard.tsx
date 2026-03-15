"use client"

import { useMemo } from "react"
import { ClipboardCheck, Receipt, Store, Wrench } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/format"

import { HorizontalBarChart, MonthlyBarChart } from "./charts"
import { KpiCard } from "./kpi-card"

// 清掃業ダッシュボード用の型定義とUI
export type CleaningDashboardData = {
  industry: "car_cleaning"
  pendingCounts: { cleaningJobs: number; expenses: number }
  monthlyKpi: {
    sales: { current: number; prev: number; change: number | null }
    expenses: { current: number; prev: number; change: number | null }
    profit: { current: number; prev: number; change: number | null; rate: number }
    jobCount: number; approvalRate: number; reviewCount: number; avgLeadTimeHours: number
  }
  unbilledAmount: { amount: number; count: number }
  monthlySales: { ym: string; amount: number }[]
  monthlyExpenses: { ym: string; amount: number }[]
  monthlyJobCounts: { ym: string; count: number }[]
  storeBreakdown: { name: string; amount: number }[]
  workTypeBreakdown: { name: string; amount: number }[]
  expenseCategoryBreakdown: { name: string; amount: number }[]
  staffAnalysis: {
    emp_id: string; name: string; totalJobs: number; approvedJobs: number
    approvalRate: number; amount: number; avgLeadTimeHours: number
  }[]
  attendanceSummary: { totalWorkHours: number; totalOvertimeHours: number; activeEmployees: number; approvedCount: number }
}

export function CleaningDashboard({
  data, isLoading, includeAll, periodMonths,
}: {
  data: CleaningDashboardData; isLoading: boolean; includeAll: boolean; periodMonths: number
}) {
  const kpi = data.monthlyKpi
  const sales = useMemo(() => data.monthlySales.slice(-periodMonths), [data.monthlySales, periodMonths])
  const expenses = useMemo(() => data.monthlyExpenses.slice(-periodMonths), [data.monthlyExpenses, periodMonths])

  const comparisonRows = useMemo(() => {
    return sales.map((s, i) => {
      const e = expenses[i]?.amount ?? 0
      return { ym: s.ym, sales: s.amount, expenses: e, profit: s.amount - e }
    })
  }, [sales, expenses])

  const pendingCards = [
    { key: "jobs", title: "作業実績", count: data.pendingCounts.cleaningJobs, href: "/admin?tab=cleaning-jobs" },
    { key: "expenses", title: "経費", count: data.pendingCounts.expenses, href: "/admin?tab=expenses" },
  ]

  return (
    <>
      {/* ① 当月 KPI（8カード） */}
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
            <KpiCard title="未請求残高" value={isLoading ? "---" : formatCurrency(data.unbilledAmount.amount)}
              subValue={isLoading ? undefined : `${data.unbilledAmount.count} 件 → 請求書を作成`} change={null}
              badge={!isLoading && data.unbilledAmount.count > 0 ? "未発行" : undefined} colorScheme="purple" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="当月 作業件数" value={isLoading ? "---" : `${kpi.jobCount} 件`} change={null} colorScheme="slate" />
          <KpiCard title="承認率" value={isLoading ? "---" : `${kpi.approvalRate}%`}
            subValue={isLoading ? undefined : `要レビュー: ${kpi.reviewCount}件`} change={null} colorScheme="amber" />
          <KpiCard title="要レビュー" value={isLoading ? "---" : `${kpi.reviewCount} 件`} change={null}
            badge={!isLoading && kpi.reviewCount > 0 ? "要対応" : undefined} colorScheme="orange" />
          <KpiCard title="平均承認リードタイム" value={isLoading ? "---" : kpi.avgLeadTimeHours < 24 ? `${kpi.avgLeadTimeHours} 時間` : `${Math.round(kpi.avgLeadTimeHours / 24 * 10) / 10} 日`}
            change={null} colorScheme="slate" />
        </div>
      </section>

      {/* ② 承認待ち */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">承認待ち</h2>
        <div className="grid gap-4 md:grid-cols-2">
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
                  <p className="text-sm text-muted-foreground">{c.count > 0 ? "クリックして確認" : "すべて処理済み"}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ③ 月別グラフ */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">月別推移</h2>
        <div className="grid gap-6 xl:grid-cols-2">
          <MonthlyBarChart title="月別売上" description={`直近 ${periodMonths} ヶ月`} rows={sales} barClassName="fill-blue-500"
            emptyIcon={ClipboardCheck} emptyDescription="作業実績を登録してください" />
          <MonthlyBarChart title="月別経費" description={`直近 ${periodMonths} ヶ月`} rows={expenses} barClassName="fill-orange-400"
            emptyIcon={Receipt} emptyDescription="経費申請を登録してください" />
        </div>
      </section>

      {/* ④ 店舗別・作業種別・経費区分 */}
      <section className="grid gap-6 xl:grid-cols-3">
        <HorizontalBarChart title="店舗別売上（当月）" description="上位10店舗" rows={data.storeBreakdown}
          colors={["bg-blue-500", "bg-blue-400", "bg-blue-300", "bg-sky-400", "bg-sky-300", "bg-cyan-400", "bg-cyan-300", "bg-teal-400", "bg-teal-300", "bg-teal-200"]}
          emptyIcon={Store} emptyDescription="当月の実績がありません" isLoading={isLoading} />
        <HorizontalBarChart title="作業種別売上（当月）" description="上位10種別" rows={data.workTypeBreakdown}
          colors={["bg-emerald-500", "bg-emerald-400", "bg-emerald-300", "bg-green-400", "bg-green-300", "bg-lime-400", "bg-lime-300", "bg-lime-200", "bg-lime-100", "bg-lime-50"]}
          emptyIcon={Wrench} emptyDescription="当月の実績がありません" isLoading={isLoading} />
        <HorizontalBarChart title="経費区分別（当月）" description={includeAll ? "全ステータス" : "承認済みのみ"} rows={data.expenseCategoryBreakdown}
          colors={["bg-orange-400", "bg-amber-400", "bg-yellow-400", "bg-orange-300", "bg-amber-300"]}
          emptyIcon={Receipt} emptyDescription="当月の経費がありません" isLoading={isLoading} />
      </section>

      {/* ⑤ 月別比較テーブル */}
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

        {/* ⑥ 勤怠サマリー */}
        <Card>
          <CardHeader><CardTitle>勤怠サマリー（当月）</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "承認済み勤怠", value: `${data.attendanceSummary.approvedCount} 件` },
                { label: "稼働社員数", value: `${data.attendanceSummary.activeEmployees} 名` },
                { label: "総勤務時間", value: `${data.attendanceSummary.totalWorkHours} h` },
                { label: "総残業時間", value: `${data.attendanceSummary.totalOvertimeHours} h` },
              ].map(item => (
                <div key={item.label} className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold">{isLoading ? "---" : item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ⑦ スタッフ稼働分析 */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>スタッフ稼働分析（当月）</CardTitle>
            <CardDescription>作業件数・承認率・売上・平均承認リードタイムをスタッフ別に表示</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton columns={6} rows={5} /> :
              data.staffAnalysis.length === 0 ? <EmptyState icon={ClipboardCheck} description="当月の実績がありません" /> : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="whitespace-nowrap">スタッフ</TableHead>
                    <TableHead className="whitespace-nowrap text-right">件数</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">承認済み</TableHead>
                    <TableHead className="whitespace-nowrap text-right">承認率</TableHead>
                    <TableHead className="whitespace-nowrap text-right">売上</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">平均リードタイム</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data.staffAnalysis.map(s => (
                      <TableRow key={s.emp_id}>
                        <TableCell className="whitespace-nowrap font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.totalJobs}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">{s.approvedJobs}</TableCell>
                        <TableCell className="text-right">{s.approvalRate}%</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-semibold text-blue-700">{formatCurrency(s.amount)}</TableCell>
                        <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                          {s.avgLeadTimeHours < 24 ? `${s.avgLeadTimeHours}h` : `${Math.round(s.avgLeadTimeHours / 24 * 10) / 10}d`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
