"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Database, Receipt, Truck } from "lucide-react"
import { toast } from "sonner"

import { EmpRequestPanel } from "@/components/admin/emp-request-panel"
import { EmptyState } from "@/components/empty-state"
import { EmployeeManagementPanel } from "@/components/admin/employee-management-panel"
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
import { formatCurrency } from "@/lib/format"

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

type AdminTab = "billables" | "expenses" | "closings" | "employees" | "empRequests"
type UserRole = "DRIVER" | "ADMIN" | "OWNER"

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

type ClosingWarnings = {
  pendingBillables: number
  pendingExpenses: number
  pendingAttendances: number
}

type ClosingSummary = {
  ym: string
  approvedSales: number
  approvedExpenses: number
  attendanceSummary: Record<string, { work_min: number; overtime_min: number }>
  warnings: ClosingWarnings
}

type ClosingRecord = {
  id: string
  ym: string
  closed_at: string | null
  closed_by: string | null
  note: string | null
}

type MeResponse =
  | {
      registered: true
      emp_id: string
      name: string
      role: UserRole
      is_active: boolean
    }
  | {
      registered: false
      email: string | null
    }
  | {
      error?: string
    }

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

const INITIAL_BILLABLE_FILTER: BillableStatusFilter = "REVIEW_REQUIRED"
const INITIAL_EXPENSE_FILTER: ExpenseStatusFilter = "SUBMITTED"

// クエリ文字列から初期タブを安全に決める
function getAdminTabFromQuery(value: string | null): AdminTab {
  if (value === "expenses") return "expenses"
  if (value === "closings") return "closings"
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

// date input 用に日付文字列を YYYY-MM-DD 形式へ整える
function formatDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// month input 用に日付文字列を YYYY-MM 形式へ整える
function formatMonthInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

// month input の値を API 用の YYYYMM に変換する
function toYmValue(value: string) {
  return value.replace("-", "")
}

// 年月入力を YYYYMM に正規化する
function normalizeYmInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 6)
}

// YYYYMM を画面表示用の YYYY/MM に整える
function formatYm(value: string) {
  if (!/^\d{6}$/.test(value)) return value
  return `${value.slice(0, 4)}/${value.slice(4, 6)}`
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

// 実績ステータスを日本語表示に変換する
function getBillableStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "VOID") return "無効"
  return "承認待ち"
}

// 経費ステータスを日本語表示に変換する
function getExpenseStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "REJECTED") return "却下"
  if (status === "REWORK_REQUIRED") return "差し戻し"
  if (status === "PAID") return "支払済み"
  return "申請中"
}

// 理由入力アクション名を日本語表示に変換する
function getReasonActionLabel(action: ExpenseReasonAction | null) {
  if (action === "reject") return "却下"
  if (action === "rework") return "差し戻し"
  return ""
}

// 締め前警告を画面表示用の文言一覧に変換する
function getClosingWarningMessages(warnings: ClosingWarnings) {
  const messages: string[] = []

  if (warnings.pendingBillables > 0) {
    messages.push(`運行実績に未承認が ${warnings.pendingBillables} 件あります。`)
  }

  if (warnings.pendingExpenses > 0) {
    messages.push(`経費申請に未承認が ${warnings.pendingExpenses} 件あります。`)
  }

  if (warnings.pendingAttendances > 0) {
    messages.push(`勤怠申請に未承認が ${warnings.pendingAttendances} 件あります。`)
  }

  return messages
}

export default function AdminApprovalPage() {
  const today = useMemo(() => new Date(), [])
  const [activeTab, setActiveTab] = useState<AdminTab>("billables")
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)
  const [masters, setMasters] = useState<MasterResponse>({
    customers: [],
    routes: [],
  })
  const [billables, setBillables] = useState<Billable[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [closings, setClosings] = useState<ClosingRecord[]>([])
  const [closingSummary, setClosingSummary] = useState<ClosingSummary | null>(null)
  const [billableStatusFilter, setBillableStatusFilter] =
    useState<BillableStatusFilter>(INITIAL_BILLABLE_FILTER)
  const [billableEmpIdFilter, setBillableEmpIdFilter] = useState("")
  const [billableRunDateFrom, setBillableRunDateFrom] = useState("")
  const [billableRunDateTo, setBillableRunDateTo] = useState("")
  const [expenseStatusFilter, setExpenseStatusFilter] =
    useState<ExpenseStatusFilter>(INITIAL_EXPENSE_FILTER)
  const [isMasterLoading, setIsMasterLoading] = useState(true)
  const [isBillableListLoading, setIsBillableListLoading] = useState(true)
  const [isExpenseListLoading, setIsExpenseListLoading] = useState(false)
  const [isClosingListLoading, setIsClosingListLoading] = useState(false)
  const [isClosingActionLoading, setIsClosingActionLoading] = useState(false)
  const [pageError, setPageError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [processingKey, setProcessingKey] = useState("")
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [selectedBillable, setSelectedBillable] = useState<Billable | null>(null)
  const [billableToVoid, setBillableToVoid] = useState<Billable | null>(null)
  const [approveAmount, setApproveAmount] = useState("")
  const [billableDialogError, setBillableDialogError] = useState("")
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [expenseReasonAction, setExpenseReasonAction] =
    useState<ExpenseReasonAction | null>(null)
  const [expenseReason, setExpenseReason] = useState("")
  const [expenseDialogError, setExpenseDialogError] = useState("")
  const [isExpenseReasonDialogOpen, setIsExpenseReasonDialogOpen] = useState(false)
  const [isExpenseRejectDialogOpen, setIsExpenseRejectDialogOpen] = useState(false)
  const [billableExportFrom, setBillableExportFrom] = useState(() =>
    formatDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1))
  )
  const [billableExportTo, setBillableExportTo] = useState(() => formatDateInputValue(today))
  const [expenseExportMonth, setExpenseExportMonth] = useState(() =>
    formatMonthInputValue(today)
  )
  const [closingYm, setClosingYm] = useState(() => toYmValue(formatMonthInputValue(today)))
  const [closingNote, setClosingNote] = useState("")
  const [isClosingConfirmOpen, setIsClosingConfirmOpen] = useState(false)

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

  const filteredBillables = useMemo(() => {
    return billables.filter((billable) => {
      const matchesEmpId = billableEmpIdFilter.trim()
        ? (billable.emp_id ?? "")
            .toLowerCase()
            .includes(billableEmpIdFilter.trim().toLowerCase())
        : true

      const runDate = billable.run_date ?? ""
      const matchesFrom = billableRunDateFrom ? runDate >= billableRunDateFrom : true
      const matchesTo = billableRunDateTo ? runDate <= billableRunDateTo : true

      return matchesEmpId && matchesFrom && matchesTo
    })
  }, [billableEmpIdFilter, billableRunDateFrom, billableRunDateTo, billables])

  const isBillableBusy = isMasterLoading || isBillableListLoading
  const isExpenseBusy = isExpenseListLoading
  const isClosingBusy = isClosingListLoading || isClosingActionLoading
  const showCurrentTabPermissionError =
    hasNoPermission &&
    (activeTab === "billables" || activeTab === "expenses" || activeTab === "closings")

  useEffect(() => {
    if (pageError) {
      toast.error(pageError)
    }
  }, [pageError])

  useEffect(() => {
    if (actionMessage) {
      toast.success(actionMessage)
    }
  }, [actionMessage])

  useEffect(() => {
    if (billableDialogError) {
      toast.error(billableDialogError)
    }
  }, [billableDialogError])

  useEffect(() => {
    if (expenseDialogError) {
      toast.error(expenseDialogError)
    }
  }, [expenseDialogError])

  useEffect(() => {
    if (showCurrentTabPermissionError) {
      toast.error("権限がありません")
    }
  }, [showCurrentTabPermissionError])

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

  // 現在ログイン中の社員ロールを取得する
  const loadCurrentUser = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" })
    const data = (await response.json()) as MeResponse

    if (!response.ok) {
      throw new Error(getErrorMessage(data, "社員情報の取得に失敗しました"))
    }

    if ("registered" in data && data.registered) {
      setCurrentUserRole(data.role)
      return
    }

    setCurrentUserRole(null)
  }, [])

  // 締め済み一覧を取得する
  const loadClosings = useCallback(async () => {
    setIsClosingListLoading(true)
    setPageError("")

    try {
      const response = await fetch("/api/admin/closing", { cache: "no-store" })
      const data = (await response.json()) as ClosingRecord[] | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setClosings([])
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "締め済み一覧の取得に失敗しました"))
      }

      setHasNoPermission(false)
      setClosings(Array.isArray(data) ? data : [])
    } finally {
      setIsClosingListLoading(false)
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
        await Promise.all([loadMasters(), loadCurrentUser()])
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "画面の読み込みに失敗しました"
        setPageError(message)
      }
    }

    void initialize()
  }, [loadCurrentUser, loadMasters])

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

  useEffect(() => {
    if (activeTab !== "closings") return

    async function reload() {
      setActionMessage("")

      try {
        await loadClosings()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "締め済み一覧の取得に失敗しました"
        setPageError(message)
      }
    }

    void reload()
  }, [activeTab, loadClosings])

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
    async () => {
      if (!billableToVoid) return

      setProcessingKey(`billable:${billableToVoid.id}`)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/billable/${billableToVoid.id}`, {
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

        setActionMessage(`実績 ${billableToVoid.billable_id} を無効にしました。`)
        setBillableToVoid(null)
        await loadBillables(billableStatusFilter)
      } catch (error) {
        const message = error instanceof Error ? error.message : "無効化に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [billableStatusFilter, billableToVoid, loadBillables]
  )

  // 理由入力が必要な経費アクション用モーダルを開く
  const openExpenseReasonDialog = useCallback(
    (expense: Expense, action: ExpenseReasonAction) => {
      setSelectedExpense(expense)
      setExpenseReasonAction(action)
      setExpenseReason("")
      setExpenseDialogError("")

      if (action === "reject") {
        setIsExpenseRejectDialogOpen(true)
        return
      }

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
          setIsExpenseRejectDialogOpen(false)
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
        setIsExpenseRejectDialogOpen(false)
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

  // 却下確認ダイアログから経費却下を実行する
  const handleConfirmExpenseReject = useCallback(async () => {
    if (!selectedExpense) return

    const reason = expenseReason.trim()
    if (!reason) {
      setExpenseDialogError("却下理由を入力してください")
      return
    }

    await runExpenseAction(selectedExpense, "reject", { reason })
  }, [expenseReason, runExpenseAction, selectedExpense])

  // 運行実績 CSV を指定期間でダウンロードする
  const handleBillableCsvDownload = useCallback(() => {
    const params = new URLSearchParams()

    if (billableExportFrom) params.set("from", billableExportFrom)
    if (billableExportTo) params.set("to", billableExportTo)

    window.location.href = `/api/export/billables?${params.toString()}`
  }, [billableExportFrom, billableExportTo])

  // 運行実績フィルタを初期値へ戻す
  const resetBillableFilters = useCallback(() => {
    setBillableStatusFilter(INITIAL_BILLABLE_FILTER)
    setBillableEmpIdFilter("")
    setBillableRunDateFrom("")
    setBillableRunDateTo("")
  }, [])

  // 経費 CSV を指定年月でダウンロードする
  const handleExpenseCsvDownload = useCallback(() => {
    const params = new URLSearchParams()

    if (expenseExportMonth) params.set("ym", toYmValue(expenseExportMonth))

    window.location.href = `/api/export/expenses?${params.toString()}`
  }, [expenseExportMonth])

  // 締め前サマリを取得して警告内容を表示する
  const handleClosingPreview = useCallback(async () => {
    if (!/^\d{6}$/.test(closingYm)) {
      setPageError("年月は YYYYMM 形式で入力してください")
      return
    }

    setIsClosingActionLoading(true)
    setPageError("")
    setActionMessage("")

    try {
      const response = await fetch("/api/admin/closing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ym: closingYm,
          note: closingNote.trim() || undefined,
          preview: true,
        }),
      })
      const data = (await response.json()) as ClosingSummary | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "締め前サマリの取得に失敗しました"))
      }

      setHasNoPermission(false)
      setClosingSummary(data as ClosingSummary)

      const warningMessages = getClosingWarningMessages((data as ClosingSummary).warnings)
      setActionMessage(
        warningMessages.length === 0
          ? `${formatYm(closingYm)} の締め前サマリを取得しました。未承認はありません。`
          : `${formatYm(closingYm)} の締め前サマリを取得しました。警告内容を確認してください。`
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "締め前サマリの取得に失敗しました"
      setPageError(message)
    } finally {
      setIsClosingActionLoading(false)
    }
  }, [closingNote, closingYm])

  // 月次締め確認ダイアログを開く
  const openExecuteClosingDialog = useCallback(() => {
    if (!/^\d{6}$/.test(closingYm)) {
      setPageError("年月は YYYYMM 形式で入力してください")
      return
    }

    setIsClosingConfirmOpen(true)
  }, [closingYm])

  // 月次締めを実行して一覧を更新する
  const handleExecuteClosing = useCallback(async () => {
    if (!/^\d{6}$/.test(closingYm)) {
      setPageError("年月は YYYYMM 形式で入力してください")
      return
    }

    setIsClosingActionLoading(true)
    setPageError("")
    setActionMessage("")

    try {
      const response = await fetch("/api/admin/closing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ym: closingYm,
          note: closingNote.trim() || undefined,
        }),
      })
      const data = (await response.json()) as ClosingSummary | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "締め実行に失敗しました"))
      }

      setHasNoPermission(false)
      setClosingSummary(data as ClosingSummary)
      setActionMessage(`${formatYm(closingYm)} の締めを実行しました。`)
      setIsClosingConfirmOpen(false)
      await loadClosings()
    } catch (error) {
      const message = error instanceof Error ? error.message : "締め実行に失敗しました"
      setPageError(message)
    } finally {
      setIsClosingActionLoading(false)
    }
  }, [closingNote, closingYm, loadClosings])

  // 締め済み月を取り消して一覧を更新する
  const handleReopenClosing = useCallback(
    async (ym: string) => {
      const confirmed = window.confirm(
        `${formatYm(ym)} の締めを取り消します。よろしいですか？`
      )
      if (!confirmed) return

      setIsClosingActionLoading(true)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/admin/closing?ym=${encodeURIComponent(ym)}`, {
          method: "DELETE",
        })
        const data = (await response.json()) as { error?: string; ok?: boolean }

        if (response.status === 403) {
          setHasNoPermission(true)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "締め取り消しに失敗しました"))
        }

        setHasNoPermission(false)
        if (closingSummary?.ym === ym) {
          setClosingSummary(null)
        }
        setActionMessage(`${formatYm(ym)} の締めを取り消しました。`)
        await loadClosings()
      } catch (error) {
        const message = error instanceof Error ? error.message : "締め取り消しに失敗しました"
        setPageError(message)
      } finally {
        setIsClosingActionLoading(false)
      }
    },
    [closingSummary, loadClosings]
  )

  const closingWarningMessages = closingSummary
    ? getClosingWarningMessages(closingSummary.warnings)
    : []

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
                    variant={activeTab === "closings" ? "default" : "outline"}
                    onClick={() => setActiveTab("closings")}
                  >
                    月次締め
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

                      <div className="w-full max-w-xs space-y-2">
                        <Label htmlFor="billable-emp-id-filter">社員 ID</Label>
                        <Input
                          id="billable-emp-id-filter"
                          value={billableEmpIdFilter}
                          onChange={(event) => setBillableEmpIdFilter(event.target.value)}
                          placeholder="部分一致で検索"
                          disabled={isBillableBusy}
                        />
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <Label htmlFor="billable-run-date-from">運行日 From</Label>
                        <Input
                          id="billable-run-date-from"
                          type="date"
                          value={billableRunDateFrom}
                          onChange={(event) => setBillableRunDateFrom(event.target.value)}
                          disabled={isBillableBusy}
                        />
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <Label htmlFor="billable-run-date-to">運行日 To</Label>
                        <Input
                          id="billable-run-date-to"
                          type="date"
                          value={billableRunDateTo}
                          onChange={(event) => setBillableRunDateTo(event.target.value)}
                          disabled={isBillableBusy}
                        />
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <Label htmlFor="billable-export-from">期間 From</Label>
                        <Input
                          id="billable-export-from"
                          type="date"
                          value={billableExportFrom}
                          onChange={(event) => setBillableExportFrom(event.target.value)}
                        />
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <Label htmlFor="billable-export-to">期間 To</Label>
                        <Input
                          id="billable-export-to"
                          type="date"
                          value={billableExportTo}
                          onChange={(event) => setBillableExportTo(event.target.value)}
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => void loadBillables(billableStatusFilter)}
                        disabled={isBillableBusy}
                      >
                        再読み込み
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={resetBillableFilters}
                        disabled={isBillableBusy}
                      >
                        リセット
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={handleBillableCsvDownload}
                        disabled={!billableExportFrom || !billableExportTo}
                      >
                        CSV ダウンロード
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
                      <TableSkeleton columns={10} rows={4} />
                    ) : filteredBillables.length === 0 ? (
                      <EmptyState
                        icon={Truck}
                        description={
                          billables.length === 0
                            ? "上のフォームから最初の運行実績を登録してください"
                            : "条件に合う運行実績がありません。フィルタを見直してください"
                        }
                      />
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
                            {filteredBillables.map((billable) => {
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
                                    <StatusBadge status={billable.status}>
                                      {getBillableStatusLabel(billable.status)}
                                    </StatusBadge>
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
                                          onClick={() => setBillableToVoid(billable)}
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

                      <div className="w-full max-w-xs space-y-2">
                        <Label htmlFor="expense-export-month">年月</Label>
                        <Input
                          id="expense-export-month"
                          type="month"
                          value={expenseExportMonth}
                          onChange={(event) => setExpenseExportMonth(event.target.value)}
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => void loadExpenses(expenseStatusFilter)}
                        disabled={isExpenseBusy}
                      >
                        再読み込み
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={handleExpenseCsvDownload}
                        disabled={!expenseExportMonth}
                      >
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
                    {isExpenseBusy ? (
                      <TableSkeleton columns={10} rows={4} />
                    ) : expenses.length === 0 ? (
                      <EmptyState
                        icon={Receipt}
                        description="上のフォームから最初の経費申請を登録してください"
                      />
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
                                    <StatusBadge status={expense.status}>
                                      {getExpenseStatusLabel(expense.status)}
                                    </StatusBadge>
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

            {activeTab === "closings" ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>月次締め</CardTitle>
                    <CardDescription>
                      対象年月の締め前確認と締め実行を行います。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <Label htmlFor="closing-ym">年月（YYYYMM）</Label>
                        <Input
                          id="closing-ym"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="例: 202603"
                          value={closingYm}
                          onChange={(event) =>
                            setClosingYm(normalizeYmInput(event.target.value))
                          }
                          disabled={isClosingBusy}
                        />
                        <p className="text-xs text-muted-foreground">
                          6 桁の年月を入力してください。
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="closing-note">メモ（任意）</Label>
                        <textarea
                          id="closing-note"
                          className={TEXTAREA_CLASS}
                          value={closingNote}
                          onChange={(event) => setClosingNote(event.target.value)}
                          placeholder="締め時の補足メモがあれば入力してください"
                          disabled={isClosingBusy}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleClosingPreview()}
                        disabled={isClosingBusy}
                      >
                        {isClosingActionLoading ? "取得中..." : "締め前サマリ"}
                      </Button>
                      <Button
                        type="button"
                        onClick={openExecuteClosingDialog}
                        disabled={isClosingBusy}
                      >
                        {isClosingActionLoading ? "締め処理中..." : "締め実行"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void loadClosings()}
                        disabled={isClosingBusy}
                      >
                        一覧更新
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {closingSummary ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>締め前サマリ</CardTitle>
                      <CardDescription>
                        {formatYm(closingSummary.ym)} 時点の承認済み集計です。
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                        {closingWarningMessages.length > 0 ? (
                          <div className="space-y-1">
                            {closingWarningMessages.map((message) => (
                              <p key={message}>{message}</p>
                            ))}
                          </div>
                        ) : (
                          <p>未承認データはありません。このまま締め実行できます。</p>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border px-4 py-3">
                          <p className="text-sm text-muted-foreground">承認済み売上</p>
                          <p className="mt-1 text-2xl font-semibold">
                            {formatCurrency(closingSummary.approvedSales)}
                          </p>
                        </div>
                        <div className="rounded-lg border px-4 py-3">
                          <p className="text-sm text-muted-foreground">承認済み経費</p>
                          <p className="mt-1 text-2xl font-semibold">
                            {formatCurrency(closingSummary.approvedExpenses)}
                          </p>
                        </div>
                        <div className="rounded-lg border px-4 py-3">
                          <p className="text-sm text-muted-foreground">承認済み勤怠社員数</p>
                          <p className="mt-1 text-2xl font-semibold">
                            {formatNumber(
                              Object.keys(closingSummary.attendanceSummary).length
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader>
                    <CardTitle>締め済み一覧</CardTitle>
                    <CardDescription>登録済みの月次締めを新しい順に表示します。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isClosingListLoading ? (
                      <TableSkeleton columns={5} rows={4} />
                    ) : closings.length === 0 ? (
                      <EmptyState
                        icon={Database}
                        description="上のフォームから最初の月次締めを登録してください"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>年月</TableHead>
                              <TableHead>締め日時</TableHead>
                              <TableHead>締め実行者</TableHead>
                              <TableHead>メモ</TableHead>
                              <TableHead>操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {closings.map((closing) => (
                              <TableRow key={closing.id}>
                                <TableCell>{formatYm(closing.ym)}</TableCell>
                                <TableCell>{formatDateTime(closing.closed_at)}</TableCell>
                                <TableCell>{closing.closed_by ?? "-"}</TableCell>
                                <TableCell className="max-w-72 whitespace-normal">
                                  {closing.note || "-"}
                                </TableCell>
                                <TableCell>
                                  {currentUserRole === "OWNER" ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => void handleReopenClosing(closing.ym)}
                                      disabled={isClosingBusy}
                                    >
                                      取り消し
                                    </Button>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
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

      <AlertDialog
        open={billableToVoid !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBillableToVoid(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>実績を無効にしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {billableToVoid
                ? `この実績を無効にしますか？元に戻せません。対象: ${billableToVoid.billable_id}`
                : "この実績を無効にしますか？元に戻せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingKey}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!processingKey}
              onClick={(event) => {
                event.preventDefault()
                void handleVoid()
              }}
            >
              {processingKey ? "無効化中..." : "無効にする"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isExpenseRejectDialogOpen}
        onOpenChange={(open) => {
          if (processingKey) return

          setIsExpenseRejectDialogOpen(open)
          if (!open) {
            setSelectedExpense(null)
            setExpenseReasonAction(null)
            setExpenseReason("")
            setExpenseDialogError("")
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
              onChange={(event) => setExpenseReason(event.target.value)}
              disabled={!!processingKey}
              placeholder="理由を入力してください"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingKey}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!processingKey}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmExpenseReject()
              }}
            >
              {processingKey ? "却下中..." : "理由を保存して却下"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isClosingConfirmOpen}
        onOpenChange={(open) => {
          if (processingKey) return
          setIsClosingConfirmOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{formatYm(closingYm)} を締めますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {formatYm(closingYm)} を締めます。締め後は当月への入力がブロックされます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosingBusy}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={isClosingBusy}
              onClick={(event) => {
                event.preventDefault()
                void handleExecuteClosing()
              }}
            >
              {isClosingActionLoading ? "締め処理中..." : "締め実行"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
