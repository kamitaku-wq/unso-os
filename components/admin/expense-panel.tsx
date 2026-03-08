"use client"

import { useCallback, useEffect, useState } from "react"
import { Receipt } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/table-skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from "@/lib/format"

type ExpenseStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "REWORK_REQUIRED" | "PAID"
type ExpenseStatusFilter = "ALL" | ExpenseStatus
type ExpenseReasonAction = "reject" | "rework"

type Expense = {
  id: string
  expense_id: string
  emp_id: string | null
  expense_date: string | null
  ym: string | null
  category_name: string | null
  amount: number | null
  vendor: string | null
  description: string | null
  status: string
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  reject_reason: string | null
  rework_reason: string | null
  paid_at: string | null
}

const INITIAL_FILTER: ExpenseStatusFilter = "SUBMITTED"

const EXPENSE_STATUS_OPTIONS: { value: ExpenseStatusFilter; label: string }[] = [
  { value: "ALL", label: "全件" },
  { value: "SUBMITTED", label: "申請中" },
  { value: "APPROVED", label: "承認済み" },
  { value: "REJECTED", label: "却下" },
  { value: "REWORK_REQUIRED", label: "差し戻し" },
  { value: "PAID", label: "支払済み" },
]

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

function formatMonthInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function toYmValue(value: string) {
  return value.replace("-", "")
}

function getExpenseStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "REJECTED") return "却下"
  if (status === "REWORK_REQUIRED") return "差し戻し"
  if (status === "PAID") return "支払済み"
  return "申請中"
}

function getReasonActionLabel(action: ExpenseReasonAction | null) {
  if (action === "reject") return "却下"
  if (action === "rework") return "差し戻し"
  return ""
}

// 経費申請の承認・却下・差し戻し・支払い・削除・CSV出力を担当するパネルコンポーネント
export function ExpensePanel() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<ExpenseStatusFilter>(INITIAL_FILTER)
  const [isExpenseListLoading, setIsExpenseListLoading] = useState(true)
  const [processingKey, setProcessingKey] = useState("")
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [expenseReasonAction, setExpenseReasonAction] = useState<ExpenseReasonAction | null>(null)
  const [expenseReason, setExpenseReason] = useState("")
  const [isExpenseReasonDialogOpen, setIsExpenseReasonDialogOpen] = useState(false)
  const [isExpenseRejectDialogOpen, setIsExpenseRejectDialogOpen] = useState(false)
  const [expenseExportMonth, setExpenseExportMonth] = useState(() => formatMonthInputValue(new Date()))

  // ステータス条件に応じた経費一覧を取得する
  const loadExpenses = useCallback(async (filter: ExpenseStatusFilter) => {
    setIsExpenseListLoading(true)
    const search = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`
    try {
      const res = await fetch(`/api/admin/expenses${search}`, { cache: "no-store" })
      const data = (await res.json()) as Expense[] | { error?: string }
      if (res.status === 403) { setExpenses([]); return }
      if (!res.ok) throw new Error(getErrorMessage(data, "経費一覧の取得に失敗しました"))
      setExpenses(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "経費一覧の取得に失敗しました")
    } finally {
      setIsExpenseListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadExpenses(expenseStatusFilter)
  }, [expenseStatusFilter, loadExpenses])

  // 理由入力が必要な経費アクション用モーダルを開く
  const openExpenseReasonDialog = useCallback((expense: Expense, action: ExpenseReasonAction) => {
    setSelectedExpense(expense)
    setExpenseReasonAction(action)
    setExpenseReason("")
    if (action === "reject") {
      setIsExpenseRejectDialogOpen(true)
    } else {
      setIsExpenseReasonDialogOpen(true)
    }
  }, [])

  // 経費更新 API を呼び出して一覧を最新化する
  const runExpenseAction = useCallback(
    async (
      expense: Expense,
      action: "approve" | "reject" | "rework" | "pay",
      extra?: { reason?: string }
    ) => {
      setProcessingKey(`expense:${expense.id}`)
      try {
        const res = await fetch(`/api/expense/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        })
        const data = (await res.json()) as { error?: string }
        if (res.status === 403) {
          setIsExpenseReasonDialogOpen(false)
          setIsExpenseRejectDialogOpen(false)
          return
        }
        if (!res.ok) throw new Error(getErrorMessage(data, "経費の更新に失敗しました"))
        const messageMap = {
          approve: "承認しました。",
          reject: "却下しました。",
          rework: "差し戻しました。",
          pay: "支払済みにしました。",
        } as const
        toast.success(`経費 ${expense.expense_id} を${messageMap[action]}`)
        setIsExpenseReasonDialogOpen(false)
        setIsExpenseRejectDialogOpen(false)
        setSelectedExpense(null)
        setExpenseReasonAction(null)
        setExpenseReason("")
        await loadExpenses(expenseStatusFilter)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "経費の更新に失敗しました")
      } finally {
        setProcessingKey("")
      }
    },
    [expenseStatusFilter, loadExpenses]
  )

  // 理由付きの経費アクションを送信する
  const handleSubmitExpenseReason = useCallback(async () => {
    if (!selectedExpense || !expenseReasonAction) return
    const reason = expenseReason.trim()
    if (!reason) {
      toast.error(`${getReasonActionLabel(expenseReasonAction)}理由を入力してください`)
      return
    }
    await runExpenseAction(selectedExpense, expenseReasonAction, { reason })
  }, [expenseReason, expenseReasonAction, runExpenseAction, selectedExpense])

  // 却下確認ダイアログから経費却下を実行する
  const handleConfirmExpenseReject = useCallback(async () => {
    if (!selectedExpense) return
    const reason = expenseReason.trim()
    if (!reason) {
      toast.error("却下理由を入力してください")
      return
    }
    await runExpenseAction(selectedExpense, "reject", { reason })
  }, [expenseReason, runExpenseAction, selectedExpense])

  // REJECTED 経費を削除する
  const handleDeleteExpense = useCallback(
    async (expense: Expense) => {
      if (!window.confirm(`経費 ${expense.expense_id} を削除します。よろしいですか？`)) return
      setProcessingKey(`expense:${expense.id}`)
      try {
        const res = await fetch(`/api/expense/${expense.id}`, { method: "DELETE" })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(getErrorMessage(data, "削除に失敗しました"))
        toast.success(`経費 ${expense.expense_id} を削除しました。`)
        await loadExpenses(expenseStatusFilter)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "削除に失敗しました")
      } finally {
        setProcessingKey("")
      }
    },
    [expenseStatusFilter, loadExpenses]
  )

  // 経費 CSV を指定年月でダウンロードする
  const handleExpenseCsvDownload = useCallback(() => {
    const params = new URLSearchParams()
    if (expenseExportMonth) params.set("ym", toYmValue(expenseExportMonth))
    window.location.href = `/api/export/expenses?${params.toString()}`
  }, [expenseExportMonth])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>絞り込み</CardTitle>
          <CardDescription>初期表示は申請中です。必要に応じてステータスを切り替えてください。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full max-w-xs space-y-2">
              <Label>ステータス</Label>
              <Select
                value={expenseStatusFilter}
                onValueChange={(value) => setExpenseStatusFilter(value as ExpenseStatusFilter)}
                disabled={isExpenseListLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="expense-export-month">年月</Label>
              <Input
                id="expense-export-month"
                type="month"
                value={expenseExportMonth}
                onChange={(e) => setExpenseExportMonth(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => void loadExpenses(expenseStatusFilter)} disabled={isExpenseListLoading}>
              再読み込み
            </Button>
            <Button variant="secondary" onClick={handleExpenseCsvDownload} disabled={!expenseExportMonth}>
              CSV ダウンロード
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>経費申請一覧</CardTitle>
          <CardDescription>最新 200 件を表示します。</CardDescription>
        </CardHeader>
        <CardContent>
          {isExpenseListLoading ? (
            <TableSkeleton columns={10} rows={4} />
          ) : expenses.length === 0 ? (
            <EmptyState icon={Receipt} description="上のフォームから最初の経費申請を登録してください" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>経費日</TableHead>
                    <TableHead>申請ID</TableHead>
                    <TableHead>社員ID</TableHead>
                    <TableHead>区分</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>支払先</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>詳細</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const isProcessing = processingKey === `expense:${expense.id}`
                    const canApprove = expense.status === "SUBMITTED"
                    const canPay = expense.status === "APPROVED"
                    const isRejected = expense.status === "REJECTED"
                    return (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.expense_date)}</TableCell>
                        <TableCell>{expense.expense_id}</TableCell>
                        <TableCell>{expense.emp_id ?? "-"}</TableCell>
                        <TableCell>{expense.category_name ?? "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="max-w-40 whitespace-normal">{expense.vendor || "-"}</TableCell>
                        <TableCell className="max-w-56 whitespace-normal">{expense.description || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={expense.status}>
                            {getExpenseStatusLabel(expense.status)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                          <div>申請: {formatDateTime(expense.submitted_at)}</div>
                          {expense.approved_at ? (
                            <div>
                              承認: {formatDateTime(expense.approved_at)}
                              {expense.approved_by ? ` / ${expense.approved_by}` : ""}
                            </div>
                          ) : null}
                          {expense.rejected_at ? (
                            <div>
                              却下: {formatDateTime(expense.rejected_at)}
                              {expense.rejected_by ? ` / ${expense.rejected_by}` : ""}
                            </div>
                          ) : null}
                          {expense.reject_reason ? <div>却下理由: {expense.reject_reason}</div> : null}
                          {expense.rework_reason ? <div>差し戻し理由: {expense.rework_reason}</div> : null}
                          {expense.paid_at ? <div>支払: {formatDateTime(expense.paid_at)}</div> : null}
                        </TableCell>
                        <TableCell>
                          {isRejected ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleDeleteExpense(expense)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "削除中..." : "削除"}
                            </Button>
                          ) : canApprove || canPay ? (
                            <div className="flex flex-wrap gap-2">
                              {canApprove ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => void runExpenseAction(expense, "approve")}
                                    disabled={isProcessing}
                                  >
                                    承認
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openExpenseReasonDialog(expense, "rework")}
                                    disabled={isProcessing}
                                  >
                                    差し戻し
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openExpenseReasonDialog(expense, "reject")}
                                    disabled={isProcessing}
                                  >
                                    却下
                                  </Button>
                                </>
                              ) : null}
                              {canPay ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => void runExpenseAction(expense, "pay")}
                                  disabled={isProcessing}
                                >
                                  支払済み
                                </Button>
                              ) : null}
                            </div>
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
        </CardContent>
      </Card>

      <Dialog
        open={isExpenseReasonDialogOpen}
        onOpenChange={(open) => {
          if (processingKey) return
          setIsExpenseReasonDialogOpen(open)
          if (!open) {
            setSelectedExpense(null)
            setExpenseReasonAction(null)
            setExpenseReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getReasonActionLabel(expenseReasonAction)}理由を入力</DialogTitle>
            <DialogDescription>
              {selectedExpense && expenseReasonAction
                ? `経費 ${selectedExpense.expense_id} を${getReasonActionLabel(expenseReasonAction)}します。理由を入力して確定してください。`
                : "対象の経費を選択してください。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-reason">{getReasonActionLabel(expenseReasonAction)}理由</Label>
              <textarea
                id="expense-reason"
                className={TEXTAREA_CLASS}
                value={expenseReason}
                onChange={(e) => setExpenseReason(e.target.value)}
                disabled={!!processingKey}
                placeholder="理由を入力してください"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsExpenseReasonDialogOpen(false)
                setSelectedExpense(null)
                setExpenseReasonAction(null)
                setExpenseReason("")
              }}
              disabled={!!processingKey}
            >
              キャンセル
            </Button>
            <Button onClick={() => void handleSubmitExpenseReason()} disabled={!!processingKey}>
              {processingKey ? "送信中..." : "理由を保存して確定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isExpenseRejectDialogOpen}
        onOpenChange={(open) => {
          if (processingKey) return
          setIsExpenseRejectDialogOpen(open)
          if (!open) {
            setSelectedExpense(null)
            setExpenseReasonAction(null)
            setExpenseReason("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>経費を却下しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedExpense
                ? `経費 ${selectedExpense.expense_id} を却下します。理由を入力して確定してください。`
                : "却下対象の経費を選択してください。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="expense-reject-reason">却下理由</Label>
            <textarea
              id="expense-reject-reason"
              className={TEXTAREA_CLASS}
              value={expenseReason}
              onChange={(e) => setExpenseReason(e.target.value)}
              disabled={!!processingKey}
              placeholder="理由を入力してください"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingKey}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!processingKey}
              onClick={(e) => { e.preventDefault(); void handleConfirmExpenseReject() }}
            >
              {processingKey ? "却下中..." : "理由を保存して却下"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
