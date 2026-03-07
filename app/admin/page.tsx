"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { EmpRequestPanel } from "@/components/admin/emp-request-panel"
import { EmployeeManagementPanel } from "@/components/admin/employee-management-panel"
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

type Customer = {
  cust_id: string
  name: string
}

type Route = {
  route_id: string
  cust_id: string
  pickup_default: string | null
  drop_default: string | null
}

type MasterResponse = {
  customers: Customer[]
  routes: Route[]
}

type AdminTab = "billables" | "expenses" | "employees" | "empRequests"

type BillableStatus = "REVIEW_REQUIRED" | "APPROVED" | "VOID"
type BillableStatusFilter = "ALL" | BillableStatus

type ExpenseStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "REWORK_REQUIRED" | "PAID"
type ExpenseStatusFilter = "ALL" | ExpenseStatus
type ExpenseReasonAction = "reject" | "rework"

type Billable = {
  id: string
  billable_id: string
  run_date: string | null
  emp_id: string | null
  cust_id: string | null
  route_id: string | null
  pickup_loc: string | null
  drop_loc: string | null
  distance_km: number | null
  amount: number | null
  status: string
}

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

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

const INITIAL_BILLABLE_FILTER: BillableStatusFilter = "REVIEW_REQUIRED"
const INITIAL_EXPENSE_FILTER: ExpenseStatusFilter = "SUBMITTED"

// クエリ文字列から初期タブを安全に決める
function getAdminTabFromQuery(value: string | null): AdminTab {
  if (value === "expenses") return "expenses"
  if (value === "employees") return "employees"
  if (value === "empRequests") return "empRequests"
  return "billables"
}

const BILLABLE_STATUS_OPTIONS: { value: BillableStatusFilter; label: string }[] = [
  { value: "ALL", label: "全件" },
  { value: "REVIEW_REQUIRED", label: "承認待ち" },
  { value: "APPROVED", label: "承認済み" },
  { value: "VOID", label: "無効" },
]

const EXPENSE_STATUS_OPTIONS: { value: ExpenseStatusFilter; label: string }[] = [
  { value: "ALL", label: "全件" },
  { value: "SUBMITTED", label: "申請中" },
  { value: "APPROVED", label: "承認済み" },
  { value: "REJECTED", label: "却下" },
  { value: "REWORK_REQUIRED", label: "差し戻し" },
  { value: "PAID", label: "支払済み" },
]

// API エラー文言を安全に取り出す
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

// 日付を画面表示用に整える
function formatDate(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString("ja-JP")
}

// 日時を画面表示用に整える
function formatDateTime(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString("ja-JP")
}

// 数値を画面表示用に整える
function formatNumber(value: number | null, options?: Intl.NumberFormatOptions) {
  if (value == null) return "-"
  return new Intl.NumberFormat("ja-JP", options).format(value)
}

// 金額を画面表示用に整える
function formatCurrency(value: number | null) {
  if (value == null) return "-"

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}

// 実績ステータスを日本語表示に変換する
function getBillableStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "VOID") return "無効"
  return "承認待ち"
}

// 実績ステータスごとのバッジ表示を切り替える
function getBillableStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default"
  if (status === "VOID") return "destructive"
  return "secondary"
}

// 経費ステータスを日本語表示に変換する
function getExpenseStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "REJECTED") return "却下"
  if (status === "REWORK_REQUIRED") return "差し戻し"
  if (status === "PAID") return "支払済み"
  return "申請中"
}

// 経費ステータスごとのバッジ表示を切り替える
function getExpenseStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default"
  if (status === "REJECTED") return "destructive"
  if (status === "REWORK_REQUIRED") return "outline"
  if (status === "PAID") return "secondary"
  return "secondary"
}

// 理由入力アクション名を日本語表示に変換する
function getReasonActionLabel(action: ExpenseReasonAction | null) {
  if (action === "reject") return "却下"
  if (action === "rework") return "差し戻し"
  return ""
}

export default function AdminApprovalPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("billables")
  const [masters, setMasters] = useState<MasterResponse>({
    customers: [],
    routes: [],
  })
  const [billables, setBillables] = useState<Billable[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [billableStatusFilter, setBillableStatusFilter] =
    useState<BillableStatusFilter>(INITIAL_BILLABLE_FILTER)
  const [expenseStatusFilter, setExpenseStatusFilter] =
    useState<ExpenseStatusFilter>(INITIAL_EXPENSE_FILTER)
  const [isMasterLoading, setIsMasterLoading] = useState(true)
  const [isBillableListLoading, setIsBillableListLoading] = useState(true)
  const [isExpenseListLoading, setIsExpenseListLoading] = useState(false)
  const [pageError, setPageError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [processingKey, setProcessingKey] = useState("")
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [selectedBillable, setSelectedBillable] = useState<Billable | null>(null)
  const [approveAmount, setApproveAmount] = useState("")
  const [billableDialogError, setBillableDialogError] = useState("")
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [expenseReasonAction, setExpenseReasonAction] =
    useState<ExpenseReasonAction | null>(null)
  const [expenseReason, setExpenseReason] = useState("")
  const [expenseDialogError, setExpenseDialogError] = useState("")
  const [isExpenseReasonDialogOpen, setIsExpenseReasonDialogOpen] = useState(false)

  const customerNameMap = useMemo(() => {
    return new Map(masters.customers.map((customer) => [customer.cust_id, customer.name]))
  }, [masters.customers])

  const routeLabelMap = useMemo(() => {
    return new Map(
      masters.routes.map((route) => {
        const customerName = customerNameMap.get(route.cust_id)
        const label = customerName ? `${route.route_id} / ${customerName}` : route.route_id
        return [route.route_id, label]
      })
    )
  }, [customerNameMap, masters.routes])

  const isBillableBusy = isMasterLoading || isBillableListLoading
  const isExpenseBusy = isExpenseListLoading
  const showCurrentTabPermissionError =
    hasNoPermission && (activeTab === "billables" || activeTab === "expenses")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setActiveTab(getAdminTabFromQuery(params.get("tab")))
  }, [])

  // マスタ表示に必要な荷主・ルートを取得する
  const loadMasters = useCallback(async () => {
    setIsMasterLoading(true)

    try {
      const response = await fetch("/api/master", { cache: "no-store" })
      const data = (await response.json()) as MasterResponse | { error?: string }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "マスタ取得に失敗しました"))
      }

      setMasters({
        customers: Array.isArray((data as MasterResponse).customers)
          ? (data as MasterResponse).customers
          : [],
        routes: Array.isArray((data as MasterResponse).routes)
          ? (data as MasterResponse).routes
          : [],
      })
    } finally {
      setIsMasterLoading(false)
    }
  }, [])

  // ステータス条件に応じた実績一覧を取得する
  const loadBillables = useCallback(async (filter: BillableStatusFilter) => {
    setIsBillableListLoading(true)
    setPageError("")

    const search = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`

    try {
      const response = await fetch(`/api/admin/billables${search}`, { cache: "no-store" })
      const data = (await response.json()) as Billable[] | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setBillables([])
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "承認一覧の取得に失敗しました"))
      }

      setHasNoPermission(false)
      setBillables(Array.isArray(data) ? data : [])
    } finally {
      setIsBillableListLoading(false)
    }
  }, [])

  // ステータス条件に応じた経費一覧を取得する
  const loadExpenses = useCallback(async (filter: ExpenseStatusFilter) => {
    setIsExpenseListLoading(true)
    setPageError("")

    const search = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`

    try {
      const response = await fetch(`/api/admin/expenses${search}`, { cache: "no-store" })
      const data = (await response.json()) as Expense[] | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setExpenses([])
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "経費一覧の取得に失敗しました"))
      }

      setHasNoPermission(false)
      setExpenses(Array.isArray(data) ? data : [])
    } finally {
      setIsExpenseListLoading(false)
    }
  }, [])

  useEffect(() => {
    async function initialize() {
      setActionMessage("")

      try {
        await loadMasters()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "画面の読み込みに失敗しました"
        setPageError(message)
      }
    }

    void initialize()
  }, [loadMasters])

  useEffect(() => {
    if (activeTab !== "billables") return

    async function reload() {
      setActionMessage("")

      try {
        await loadBillables(billableStatusFilter)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "承認一覧の取得に失敗しました"
        setPageError(message)
      }
    }

    void reload()
  }, [activeTab, billableStatusFilter, loadBillables])

  useEffect(() => {
    if (activeTab !== "expenses") return

    async function reload() {
      setActionMessage("")

      try {
        await loadExpenses(expenseStatusFilter)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "経費一覧の取得に失敗しました"
        setPageError(message)
      }
    }

    void reload()
  }, [activeTab, expenseStatusFilter, loadExpenses])

  // 実績承認モーダルを開いて金額初期値をセットする
  const openApproveDialog = useCallback((billable: Billable) => {
    setSelectedBillable(billable)
    setApproveAmount(billable.amount != null ? String(billable.amount) : "")
    setBillableDialogError("")
    setIsApproveDialogOpen(true)
  }, [])

  // 実績承認 API を呼び出して一覧を最新化する
  const handleApprove = useCallback(async () => {
    if (!selectedBillable) return

    const amount = Number(approveAmount)
    if (!approveAmount.trim() || Number.isNaN(amount)) {
      setBillableDialogError("金額を入力してください")
      return
    }

    if (amount < 0) {
      setBillableDialogError("金額は 0 以上で入力してください")
      return
    }

    setProcessingKey(`billable:${selectedBillable.id}`)
    setBillableDialogError("")
    setPageError("")

    try {
      const response = await fetch(`/api/billable/${selectedBillable.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve",
          amount,
        }),
      })
      const data = (await response.json()) as { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setIsApproveDialogOpen(false)
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "承認に失敗しました"))
      }

      setActionMessage(`実績 ${selectedBillable.billable_id} を承認しました。`)
      setIsApproveDialogOpen(false)
      setSelectedBillable(null)
      await loadBillables(billableStatusFilter)
    } catch (error) {
      const message = error instanceof Error ? error.message : "承認に失敗しました"
      setBillableDialogError(message)
    } finally {
      setProcessingKey("")
    }
  }, [approveAmount, billableStatusFilter, loadBillables, selectedBillable])

  // 実績無効化 API を呼び出して一覧を最新化する
  const handleVoid = useCallback(
    async (billable: Billable) => {
      const confirmed = window.confirm(
        `実績 ${billable.billable_id} を無効にします。よろしいですか？`
      )
      if (!confirmed) return

      setProcessingKey(`billable:${billable.id}`)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/billable/${billable.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "void",
          }),
        })
        const data = (await response.json()) as { error?: string }

        if (response.status === 403) {
          setHasNoPermission(true)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "無効化に失敗しました"))
        }

        setActionMessage(`実績 ${billable.billable_id} を無効にしました。`)
        await loadBillables(billableStatusFilter)
      } catch (error) {
        const message = error instanceof Error ? error.message : "無効化に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [billableStatusFilter, loadBillables]
  )

  // 理由入力が必要な経費アクション用モーダルを開く
  const openExpenseReasonDialog = useCallback(
    (expense: Expense, action: ExpenseReasonAction) => {
      setSelectedExpense(expense)
      setExpenseReasonAction(action)
      setExpenseReason("")
      setExpenseDialogError("")
      setIsExpenseReasonDialogOpen(true)
    },
    []
  )

  // 経費更新 API を呼び出して一覧を最新化する
  const runExpenseAction = useCallback(
    async (
      expense: Expense,
      action: "approve" | "reject" | "rework" | "pay",
      extra?: { reason?: string }
    ) => {
      setProcessingKey(`expense:${expense.id}`)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/expense/${expense.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ...extra,
          }),
        })
        const data = (await response.json()) as { error?: string }

        if (response.status === 403) {
          setHasNoPermission(true)
          setIsExpenseReasonDialogOpen(false)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "経費の更新に失敗しました"))
        }

        const messageMap = {
          approve: "承認しました。",
          reject: "却下しました。",
          rework: "差し戻しました。",
          pay: "支払済みにしました。",
        } as const

        setActionMessage(`経費 ${expense.expense_id} を${messageMap[action]}`)
        setIsExpenseReasonDialogOpen(false)
        setSelectedExpense(null)
        setExpenseReasonAction(null)
        setExpenseReason("")
        setExpenseDialogError("")
        await loadExpenses(expenseStatusFilter)
      } catch (error) {
        const message = error instanceof Error ? error.message : "経費の更新に失敗しました"

        if (action === "reject" || action === "rework") {
          setExpenseDialogError(message)
        } else {
          setPageError(message)
        }
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
      setExpenseDialogError(`${getReasonActionLabel(expenseReasonAction)}理由を入力してください`)
      return
    }

    await runExpenseAction(selectedExpense, expenseReasonAction, { reason })
  }, [expenseReason, expenseReasonAction, runExpenseAction, selectedExpense])

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">承認管理</h1>
          <p className="text-sm text-muted-foreground">
            管理者が運行実績と経費申請の承認作業を行う画面です。
          </p>
        </div>

        {showCurrentTabPermissionError ? (
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                権限がありません
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {pageError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {pageError}
              </div>
            ) : null}

            {actionMessage ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {actionMessage}
              </div>
            ) : null}

            <Card>
              <CardHeader className="gap-4">
                <div>
                  <CardTitle>管理対象</CardTitle>
                  <CardDescription>
                    画面上部のタブで承認対象を切り替えます。
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={activeTab === "billables" ? "default" : "outline"}
                    onClick={() => setActiveTab("billables")}
                  >
                    運行実績
                  </Button>
                  <Button
                    type="button"
                    variant={activeTab === "expenses" ? "default" : "outline"}
                    onClick={() => setActiveTab("expenses")}
                  >
                    経費
                  </Button>
                  <Button
                    type="button"
                    variant={activeTab === "employees" ? "default" : "outline"}
                    onClick={() => setActiveTab("employees")}
                  >
                    社員一覧
                  </Button>
                  <Button
                    type="button"
                    variant={activeTab === "empRequests" ? "default" : "outline"}
                    onClick={() => setActiveTab("empRequests")}
                  >
                    社員申請
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {activeTab === "billables" ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>絞り込み</CardTitle>
                    <CardDescription>
                      初期表示は承認待ちです。必要に応じてステータスを切り替えてください。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="w-full max-w-xs space-y-2">
                        <Label>ステータス</Label>
                        <Select
                          value={billableStatusFilter}
                          onValueChange={(value) =>
                            setBillableStatusFilter(value as BillableStatusFilter)
                          }
                          disabled={isBillableListLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="ステータスを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {BILLABLE_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => void loadBillables(billableStatusFilter)}
                        disabled={isBillableBusy}
                      >
                        再読み込み
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>運行実績一覧</CardTitle>
                    <CardDescription>最新 200 件を表示します。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isBillableBusy ? (
                      <div className="py-8 text-sm text-muted-foreground">
                        読み込み中です...
                      </div>
                    ) : billables.length === 0 ? (
                      <div className="py-8 text-sm text-muted-foreground">
                        条件に一致する運行実績はありません。
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>運行日</TableHead>
                              <TableHead>社員ID</TableHead>
                              <TableHead>荷主</TableHead>
                              <TableHead>ルート</TableHead>
                              <TableHead>積み地</TableHead>
                              <TableHead>降ろし地</TableHead>
                              <TableHead className="text-right">距離(km)</TableHead>
                              <TableHead className="text-right">金額</TableHead>
                              <TableHead>ステータス</TableHead>
                              <TableHead>操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {billables.map((billable) => {
                              const isReviewRequired =
                                billable.status === "REVIEW_REQUIRED"
                              const isProcessing =
                                processingKey === `billable:${billable.id}`

                              return (
                                <TableRow key={billable.id}>
                                  <TableCell>{formatDate(billable.run_date)}</TableCell>
                                  <TableCell>{billable.emp_id ?? "-"}</TableCell>
                                  <TableCell>
                                    {billable.cust_id
                                      ? customerNameMap.get(billable.cust_id) ??
                                        billable.cust_id
                                      : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {billable.route_id
                                      ? routeLabelMap.get(billable.route_id) ??
                                        billable.route_id
                                      : "ルートなし"}
                                  </TableCell>
                                  <TableCell>{billable.pickup_loc ?? "-"}</TableCell>
                                  <TableCell>{billable.drop_loc ?? "-"}</TableCell>
                                  <TableCell className="text-right">
                                    {formatNumber(billable.distance_km, {
                                      maximumFractionDigits: 1,
                                    })}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(billable.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={getBillableStatusVariant(billable.status)}
                                    >
                                      {getBillableStatusLabel(billable.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {isReviewRequired ? (
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => openApproveDialog(billable)}
                                          disabled={isProcessing}
                                        >
                                          承認
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => void handleVoid(billable)}
                                          disabled={isProcessing}
                                        >
                                          無効
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        -
                                      </span>
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
              </>
            ) : null}

            {activeTab === "expenses" ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>絞り込み</CardTitle>
                    <CardDescription>
                      初期表示は申請中です。必要に応じてステータスを切り替えてください。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="w-full max-w-xs space-y-2">
                        <Label>ステータス</Label>
                        <Select
                          value={expenseStatusFilter}
                          onValueChange={(value) =>
                            setExpenseStatusFilter(value as ExpenseStatusFilter)
                          }
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

                      <Button
                        variant="outline"
                        onClick={() => void loadExpenses(expenseStatusFilter)}
                        disabled={isExpenseBusy}
                      >
                        再読み込み
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
                    {isExpenseBusy ? (
                      <div className="py-8 text-sm text-muted-foreground">
                        読み込み中です...
                      </div>
                    ) : expenses.length === 0 ? (
                      <div className="py-8 text-sm text-muted-foreground">
                        条件に一致する経費申請はありません。
                      </div>
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
                              const isProcessing =
                                processingKey === `expense:${expense.id}`
                              const canApprove = expense.status === "SUBMITTED"
                              const canPay = expense.status === "APPROVED"

                              return (
                                <TableRow key={expense.id}>
                                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                                  <TableCell>{expense.expense_id}</TableCell>
                                  <TableCell>{expense.emp_id ?? "-"}</TableCell>
                                  <TableCell>{expense.category_name ?? "-"}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(expense.amount)}
                                  </TableCell>
                                  <TableCell className="max-w-40 whitespace-normal">
                                    {expense.vendor || "-"}
                                  </TableCell>
                                  <TableCell className="max-w-56 whitespace-normal">
                                    {expense.description || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={getExpenseStatusVariant(expense.status)}
                                    >
                                      {getExpenseStatusLabel(expense.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                                    <div>申請: {formatDateTime(expense.submitted_at)}</div>
                                    {expense.approved_at ? (
                                      <div>
                                        承認: {formatDateTime(expense.approved_at)}
                                        {expense.approved_by
                                          ? ` / ${expense.approved_by}`
                                          : ""}
                                      </div>
                                    ) : null}
                                    {expense.rejected_at ? (
                                      <div>
                                        却下: {formatDateTime(expense.rejected_at)}
                                        {expense.rejected_by
                                          ? ` / ${expense.rejected_by}`
                                          : ""}
                                      </div>
                                    ) : null}
                                    {expense.reject_reason ? (
                                      <div>却下理由: {expense.reject_reason}</div>
                                    ) : null}
                                    {expense.rework_reason ? (
                                      <div>差し戻し理由: {expense.rework_reason}</div>
                                    ) : null}
                                    {expense.paid_at ? (
                                      <div>支払: {formatDateTime(expense.paid_at)}</div>
                                    ) : null}
                                  </TableCell>
                                  <TableCell>
                                    {canApprove || canPay ? (
                                      <div className="flex flex-wrap gap-2">
                                        {canApprove ? (
                                          <>
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                void runExpenseAction(expense, "approve")
                                              }
                                              disabled={isProcessing}
                                            >
                                              承認
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                openExpenseReasonDialog(expense, "rework")
                                              }
                                              disabled={isProcessing}
                                            >
                                              差し戻し
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              onClick={() =>
                                                openExpenseReasonDialog(expense, "reject")
                                              }
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
                                            onClick={() =>
                                              void runExpenseAction(expense, "pay")
                                            }
                                            disabled={isProcessing}
                                          >
                                            支払済み
                                          </Button>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        -
                                      </span>
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
              </>
            ) : null}

            {activeTab === "employees" ? <EmployeeManagementPanel /> : null}

            {activeTab === "empRequests" ? <EmpRequestPanel /> : null}
          </>
        )}
      </div>

      <Dialog
        open={isApproveDialogOpen}
        onOpenChange={(open) => {
          if (processingKey) return

          setIsApproveDialogOpen(open)
          if (!open) {
            setBillableDialogError("")
            setSelectedBillable(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>金額を入力して承認</DialogTitle>
            <DialogDescription>
              {selectedBillable
                ? `実績 ${selectedBillable.billable_id} を承認します。金額を入力して確定してください。`
                : "承認する実績を選択してください。"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-amount">金額</Label>
              <Input
                id="approve-amount"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={approveAmount}
                onChange={(event) => setApproveAmount(event.target.value)}
                placeholder="例: 12000"
                disabled={!!processingKey}
              />
            </div>

            {billableDialogError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {billableDialogError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveDialogOpen(false)
                setBillableDialogError("")
                setSelectedBillable(null)
              }}
              disabled={!!processingKey}
            >
              キャンセル
            </Button>
            <Button onClick={() => void handleApprove()} disabled={!!processingKey}>
              {processingKey ? "承認中..." : "確定して承認"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isExpenseReasonDialogOpen}
        onOpenChange={(open) => {
          if (processingKey) return

          setIsExpenseReasonDialogOpen(open)
          if (!open) {
            setSelectedExpense(null)
            setExpenseReasonAction(null)
            setExpenseReason("")
            setExpenseDialogError("")
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
              <Label htmlFor="expense-reason">
                {getReasonActionLabel(expenseReasonAction)}理由
              </Label>
              <textarea
                id="expense-reason"
                className={TEXTAREA_CLASS}
                value={expenseReason}
                onChange={(event) => setExpenseReason(event.target.value)}
                disabled={!!processingKey}
                placeholder="理由を入力してください"
              />
            </div>

            {expenseDialogError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {expenseDialogError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsExpenseReasonDialogOpen(false)
                setSelectedExpense(null)
                setExpenseReasonAction(null)
                setExpenseReason("")
                setExpenseDialogError("")
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
    </main>
  )
}
