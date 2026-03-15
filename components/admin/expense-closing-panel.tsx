"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/format"

type ClosingExpense = {
  id: string
  expense_id: string
  emp_id: string | null
  expense_date: string | null
  category_name: string | null
  amount: number | null
  vendor: string | null
  description: string | null
  status: string
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
}

type EmpSummary = {
  emp_id: string
  name: string
  count: number
  submittedCount: number
  approvedCount: number
  total: number
  submittedTotal: number
  approvedTotal: number
  expenses: ClosingExpense[]
}

// 締め期間の選択肢を生成する（過去12ヶ月分）
function buildPeriodOptions() {
  const options: { value: string; label: string; start: string; end: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const endDate = new Date(now.getFullYear(), now.getMonth() - i, 20)
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 21)
    const label = `${startDate.getFullYear()}/${String(startDate.getMonth() + 1).padStart(2, "0")}/21 〜 ${endDate.getFullYear()}/${String(endDate.getMonth() + 1).padStart(2, "0")}/20`
    const startISO = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-21T00:00:00`
    const endISO = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-20T23:59:59`
    options.push({ value: `${i}`, label, start: startISO, end: endISO })
  }
  return options
}

// 経費の締め期間ビュー（従業員別サマリー + 一括承認）
export function ExpenseClosingPanel({ empNames }: { empNames: Record<string, string> }) {
  const periodOptions = useMemo(() => buildPeriodOptions(), [])
  const [selectedPeriod, setSelectedPeriod] = useState("0")
  const [expenses, setExpenses] = useState<ClosingExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)
  const [processingKey, setProcessingKey] = useState("")

  const period = periodOptions[Number(selectedPeriod)]

  const loadExpenses = useCallback(async (p: typeof period) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ start: p.start, end: p.end })
      const res = await fetch(`/api/admin/expenses/closing?${params}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, "取得に失敗しました"))
      setExpenses(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (period) void loadExpenses(period)
  }, [selectedPeriod, period, loadExpenses])

  // 従業員別サマリーを作成する
  const empSummaries = useMemo<EmpSummary[]>(() => {
    const map: Record<string, EmpSummary> = {}
    for (const exp of expenses) {
      const eid = exp.emp_id ?? "unknown"
      if (!map[eid]) {
        map[eid] = { emp_id: eid, name: empNames[eid] ?? eid, count: 0, submittedCount: 0, approvedCount: 0, total: 0, submittedTotal: 0, approvedTotal: 0, expenses: [] }
      }
      map[eid].count += 1
      map[eid].total += Number(exp.amount ?? 0)
      if (exp.status === "SUBMITTED") {
        map[eid].submittedCount += 1
        map[eid].submittedTotal += Number(exp.amount ?? 0)
      } else if (exp.status === "APPROVED" || exp.status === "PAID") {
        map[eid].approvedCount += 1
        map[eid].approvedTotal += Number(exp.amount ?? 0)
      }
      map[eid].expenses.push(exp)
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, "ja"))
  }, [expenses, empNames])

  const totalSubmitted = empSummaries.reduce((s, e) => s + e.submittedCount, 0)

  // 一括承認を実行する
  const bulkApprove = useCallback(async (ids: string[], key: string) => {
    if (ids.length === 0) { toast.info("承認対象がありません"); return }
    setProcessingKey(key)
    try {
      const res = await fetch("/api/admin/expenses/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, "一括承認に失敗しました"))
      toast.success(`${data.approved}件を承認しました`)
      if (period) await loadExpenses(period)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "一括承認に失敗しました")
    } finally {
      setProcessingKey("")
    }
  }, [period, loadExpenses])

  // 個別の経費アクション（承認・却下・差し戻し）
  const runAction = useCallback(async (expenseId: string, action: string, extra?: Record<string, string>) => {
    setProcessingKey(`single:${expenseId}`)
    try {
      const res = await fetch(`/api/expense/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, "操作に失敗しました"))
      const labels: Record<string, string> = { approve: "承認", reject: "却下", rework: "差し戻し" }
      toast.success(`${labels[action] ?? action}しました`)
      if (period) await loadExpenses(period)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作に失敗しました")
    } finally {
      setProcessingKey("")
    }
  }, [period, loadExpenses])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>経費締め期間</CardTitle>
          <CardDescription>提出日（submitted_at）基準で前月21日〜当月20日の経費を表示します。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full max-w-sm space-y-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="期間を選択" /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => period && void loadExpenses(period)} disabled={isLoading}>
              再読み込み
            </Button>
            {totalSubmitted > 0 && (
              <Button
                onClick={() => {
                  const ids = expenses.filter(e => e.status === "SUBMITTED").map(e => e.id)
                  void bulkApprove(ids, "all")
                }}
                disabled={!!processingKey}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {processingKey === "all" ? "承認中..." : `未承認 ${totalSubmitted}件 を全件承認`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="pt-6"><TableSkeleton columns={5} rows={3} /></CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>従業員別サマリー</CardTitle>
            <CardDescription>
              未承認: {totalSubmitted}件 {formatCurrency(empSummaries.reduce((s, e) => s + e.submittedTotal, 0))}
              {" / "}承認済: {empSummaries.reduce((s, e) => s + e.approvedCount, 0)}件 {formatCurrency(empSummaries.reduce((s, e) => s + e.approvedTotal, 0))}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {empSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">この期間の経費はありません。</p>
            ) : (
              empSummaries.map((emp) => (
                <EmpSection
                  key={emp.emp_id}
                  emp={emp}
                  isExpanded={expandedEmp === emp.emp_id}
                  onToggle={() => setExpandedEmp(expandedEmp === emp.emp_id ? null : emp.emp_id)}
                  onBulkApprove={() => {
                    const ids = emp.expenses.filter(e => e.status === "SUBMITTED").map(e => e.id)
                    void bulkApprove(ids, `emp:${emp.emp_id}`)
                  }}
                  onAction={runAction}
                  processingKey={processingKey}
                  empId={emp.emp_id}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 従業員ごとのセクション（サマリー行 + 展開時の明細テーブル）
function EmpSection({ emp, isExpanded, onToggle, onBulkApprove, onAction, processingKey, empId }: {
  emp: EmpSummary
  isExpanded: boolean
  onToggle: () => void
  onBulkApprove: () => void
  onAction: (id: string, action: string, extra?: Record<string, string>) => Promise<void>
  processingKey: string
  empId: string
}) {
  const isProcessing = processingKey === `emp:${empId}`
  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <div className="flex items-center gap-4">
          <button className="p-0.5">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
          <span className="font-medium">{emp.name}</span>
          {emp.submittedCount > 0 ? (
            <StatusBadge status="SUBMITTED">未承認 {emp.submittedCount}件 {formatCurrency(emp.submittedTotal)}</StatusBadge>
          ) : (
            <span className="text-sm text-muted-foreground">未承認なし</span>
          )}
          {emp.approvedCount > 0 && (
            <span className="text-sm text-muted-foreground">承認済 {emp.approvedCount}件 {formatCurrency(emp.approvedTotal)}</span>
          )}
        </div>
        {emp.submittedCount > 0 && (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onBulkApprove() }}
            disabled={!!processingKey}
          >
            {isProcessing ? "承認中..." : "全件承認"}
          </Button>
        )}
      </div>
      {isExpanded && (
        <div className="border-t px-4 py-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>提出日</TableHead>
                <TableHead>経費日</TableHead>
                <TableHead>区分</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>支払先</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emp.expenses.map((exp) => {
                const isSingle = processingKey === `single:${exp.id}`
                return (
                  <TableRow key={exp.id}>
                    <TableCell>{formatDate(exp.submitted_at)}</TableCell>
                    <TableCell>{formatDate(exp.expense_date)}</TableCell>
                    <TableCell>{exp.category_name ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                    <TableCell className="max-w-32 whitespace-normal">{exp.vendor || "-"}</TableCell>
                    <TableCell className="max-w-40 whitespace-normal">{exp.description || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={exp.status}>
                        {exp.status === "APPROVED" ? "承認済" : exp.status === "SUBMITTED" ? "未承認" : exp.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {exp.status === "SUBMITTED" ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => void onAction(exp.id, "approve")} disabled={!!processingKey}>
                            {isSingle ? "..." : "承認"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            const reason = window.prompt("差し戻し理由を入力してください")
                            if (reason) void onAction(exp.id, "rework", { reason })
                          }} disabled={!!processingKey}>
                            差し戻し
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            const reason = window.prompt("却下理由を入力してください")
                            if (reason) void onAction(exp.id, "reject", { reason })
                          }} disabled={!!processingKey}>
                            却下
                          </Button>
                        </div>
                      ) : exp.status === "APPROVED" ? (
                        <span className="text-sm text-muted-foreground">
                          {exp.approved_by ? `${exp.approved_by}が承認` : "承認済"}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
