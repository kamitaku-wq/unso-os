"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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

type BillableStatus = "REVIEW_REQUIRED" | "APPROVED" | "VOID"
type StatusFilter = "ALL" | BillableStatus

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

const INITIAL_FILTER: StatusFilter = "REVIEW_REQUIRED"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "全件" },
  { value: "REVIEW_REQUIRED", label: "承認待ち" },
  { value: "APPROVED", label: "承認済み" },
  { value: "VOID", label: "無効" },
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
function getStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "VOID") return "無効"
  return "承認待ち"
}

// ステータスごとのバッジ表示を切り替える
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default"
  if (status === "VOID") return "destructive"
  return "secondary"
}

export default function AdminBillableApprovalPage() {
  const [masters, setMasters] = useState<MasterResponse>({
    customers: [],
    routes: [],
  })
  const [billables, setBillables] = useState<Billable[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(INITIAL_FILTER)
  const [isMasterLoading, setIsMasterLoading] = useState(true)
  const [isListLoading, setIsListLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [processingId, setProcessingId] = useState("")
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [selectedBillable, setSelectedBillable] = useState<Billable | null>(null)
  const [approveAmount, setApproveAmount] = useState("")
  const [dialogError, setDialogError] = useState("")

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

  const isBusy = isMasterLoading || isListLoading

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
        routes: Array.isArray((data as MasterResponse).routes) ? (data as MasterResponse).routes : [],
      })
    } finally {
      setIsMasterLoading(false)
    }
  }, [])

  // ステータス条件に応じた承認対象一覧を取得する
  const loadBillables = useCallback(async (filter: StatusFilter) => {
    setIsListLoading(true)
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
      setIsListLoading(false)
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
  }, [loadBillables, loadMasters])

  useEffect(() => {
    async function reload() {
      setActionMessage("")

      try {
        await loadBillables(statusFilter)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "承認一覧の取得に失敗しました"
        setPageError(message)
      }
    }

    void reload()
  }, [loadBillables, statusFilter])

  // 承認モーダルを開いて金額初期値をセットする
  const openApproveDialog = useCallback((billable: Billable) => {
    setSelectedBillable(billable)
    setApproveAmount(billable.amount != null ? String(billable.amount) : "")
    setDialogError("")
    setIsApproveDialogOpen(true)
  }, [])

  // 承認 API を呼び出して一覧を最新化する
  const handleApprove = useCallback(async () => {
    if (!selectedBillable) return

    const amount = Number(approveAmount)
    if (!approveAmount.trim() || Number.isNaN(amount)) {
      setDialogError("金額を入力してください")
      return
    }

    if (amount < 0) {
      setDialogError("金額は 0 以上で入力してください")
      return
    }

    setProcessingId(selectedBillable.id)
    setDialogError("")
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
      await loadBillables(statusFilter)
    } catch (error) {
      const message = error instanceof Error ? error.message : "承認に失敗しました"
      setDialogError(message)
    } finally {
      setProcessingId("")
    }
  }, [approveAmount, loadBillables, selectedBillable, statusFilter])

  // 無効化 API を呼び出して一覧を最新化する
  const handleVoid = useCallback(
    async (billable: Billable) => {
      const confirmed = window.confirm(
        `実績 ${billable.billable_id} を無効にします。よろしいですか？`
      )
      if (!confirmed) return

      setProcessingId(billable.id)
      setPageError("")

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
        await loadBillables(statusFilter)
      } catch (error) {
        const message = error instanceof Error ? error.message : "無効化に失敗しました"
        setPageError(message)
      } finally {
        setProcessingId("")
      }
    },
    [loadBillables, statusFilter]
  )

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">運行実績承認</h1>
          <p className="text-sm text-muted-foreground">
            管理者が承認待ち実績の確認、承認、無効化を行う画面です。
          </p>
        </div>

        {hasNoPermission ? (
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
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                      disabled={isListLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ステータスを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => void loadBillables(statusFilter)}
                    disabled={isBusy}
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
                {isBusy ? (
                  <div className="py-8 text-sm text-muted-foreground">読み込み中です...</div>
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
                          const isReviewRequired = billable.status === "REVIEW_REQUIRED"
                          const isProcessing = processingId === billable.id

                          return (
                            <TableRow key={billable.id}>
                              <TableCell>{formatDate(billable.run_date)}</TableCell>
                              <TableCell>{billable.emp_id ?? "-"}</TableCell>
                              <TableCell>
                                {billable.cust_id
                                  ? customerNameMap.get(billable.cust_id) ?? billable.cust_id
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {billable.route_id
                                  ? routeLabelMap.get(billable.route_id) ?? billable.route_id
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
                                <Badge variant={getStatusVariant(billable.status)}>
                                  {getStatusLabel(billable.status)}
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
          </>
        )}
      </div>

      <Dialog
        open={isApproveDialogOpen}
        onOpenChange={(open) => {
          if (processingId) return

          setIsApproveDialogOpen(open)
          if (!open) {
            setDialogError("")
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
                disabled={!!processingId}
              />
            </div>

            {dialogError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {dialogError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveDialogOpen(false)
                setDialogError("")
                setSelectedBillable(null)
              }}
              disabled={!!processingId}
            >
              キャンセル
            </Button>
            <Button onClick={() => void handleApprove()} disabled={!!processingId}>
              {processingId ? "承認中..." : "確定して承認"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
