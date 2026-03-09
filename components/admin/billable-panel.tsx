"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Truck } from "lucide-react"
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
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/format"

type Customer = { cust_id: string; name: string }
type Route = { route_id: string; cust_id: string; pickup_default: string | null; drop_default: string | null }
type Ratecard = { route_id: string; base_fare: number }
type MasterResponse = { customers: Customer[]; routes: Route[]; ratecards: Ratecard[] }
type BillableStatus = "REVIEW_REQUIRED" | "APPROVED" | "VOID"
type BillableStatusFilter = "ALL" | BillableStatus

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

const INITIAL_FILTER: BillableStatusFilter = "REVIEW_REQUIRED"

const BILLABLE_STATUS_OPTIONS: { value: BillableStatusFilter; label: string }[] = [
  { value: "ALL", label: "全件" },
  { value: "REVIEW_REQUIRED", label: "承認待ち" },
  { value: "APPROVED", label: "承認済み" },
  { value: "VOID", label: "無効" },
]

function formatDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getBillableStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "VOID") return "無効"
  return "承認待ち"
}

function formatNumber(value: number | null, options?: Intl.NumberFormatOptions) {
  if (value == null) return "-"
  return new Intl.NumberFormat("ja-JP", options).format(value)
}

// 運行実績の承認・無効化・削除・CSV出力を担当するパネルコンポーネント
export function BillablePanel() {
  const today = useMemo(() => new Date(), [])
  const [masters, setMasters] = useState<MasterResponse>({ customers: [], routes: [], ratecards: [] })
  const [billables, setBillables] = useState<Billable[]>([])
  const [billableStatusFilter, setBillableStatusFilter] = useState<BillableStatusFilter>(INITIAL_FILTER)
  const [billableEmpIdFilter, setBillableEmpIdFilter] = useState("")
  const [billableRunDateFrom, setBillableRunDateFrom] = useState("")
  const [billableRunDateTo, setBillableRunDateTo] = useState("")
  const [isMasterLoading, setIsMasterLoading] = useState(true)
  const [isBillableListLoading, setIsBillableListLoading] = useState(true)
  const [processingKey, setProcessingKey] = useState("")
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [selectedBillable, setSelectedBillable] = useState<Billable | null>(null)
  const [billableToVoid, setBillableToVoid] = useState<Billable | null>(null)
  const [approveAmount, setApproveAmount] = useState("")
  const [billableExportFrom, setBillableExportFrom] = useState(() =>
    formatDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1))
  )
  const [billableExportTo, setBillableExportTo] = useState(() => formatDateInputValue(today))

  const isBusy = isMasterLoading || isBillableListLoading

  const customerNameMap = useMemo(
    () => new Map(masters.customers.map((c) => [c.cust_id, c.name])),
    [masters.customers]
  )

  const routeLabelMap = useMemo(
    () =>
      new Map(
        masters.routes.map((route) => {
          const customerName = customerNameMap.get(route.cust_id)
          const label = customerName ? `${route.route_id} / ${customerName}` : route.route_id
          return [route.route_id, label]
        })
      ),
    [customerNameMap, masters.routes]
  )

  const filteredBillables = useMemo(
    () =>
      billables.filter((b) => {
        const matchesEmpId = billableEmpIdFilter.trim()
          ? (b.emp_id ?? "").toLowerCase().includes(billableEmpIdFilter.trim().toLowerCase())
          : true
        const runDate = b.run_date ?? ""
        const matchesFrom = billableRunDateFrom ? runDate >= billableRunDateFrom : true
        const matchesTo = billableRunDateTo ? runDate <= billableRunDateTo : true
        return matchesEmpId && matchesFrom && matchesTo
      }),
    [billableEmpIdFilter, billableRunDateFrom, billableRunDateTo, billables]
  )

  // マスタ（荷主・ルート・運賃）を取得する
  const loadMasters = useCallback(async () => {
    setIsMasterLoading(true)
    try {
      const res = await fetch("/api/master")
      const data = (await res.json()) as MasterResponse | { error?: string }
      if (!res.ok) throw new Error(getErrorMessage(data, "マスタ取得に失敗しました"))
      setMasters({
        customers: Array.isArray((data as MasterResponse).customers) ? (data as MasterResponse).customers : [],
        routes: Array.isArray((data as MasterResponse).routes) ? (data as MasterResponse).routes : [],
        ratecards: Array.isArray((data as MasterResponse).ratecards) ? (data as MasterResponse).ratecards : [],
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "マスタ取得に失敗しました")
    } finally {
      setIsMasterLoading(false)
    }
  }, [])

  // ステータス条件に応じた実績一覧を取得する
  const loadBillables = useCallback(async (filter: BillableStatusFilter) => {
    setIsBillableListLoading(true)
    const search = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`
    try {
      const res = await fetch(`/api/admin/billables${search}`, { cache: "no-store" })
      const data = (await res.json()) as Billable[] | { error?: string }
      if (res.status === 403) { setBillables([]); return }
      if (!res.ok) throw new Error(getErrorMessage(data, "承認一覧の取得に失敗しました"))
      setBillables(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "承認一覧の取得に失敗しました")
    } finally {
      setIsBillableListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMasters()
  }, [loadMasters])

  useEffect(() => {
    void loadBillables(billableStatusFilter)
  }, [billableStatusFilter, loadBillables])

  // 実績承認モーダルを開いて金額初期値をセットする
  const openApproveDialog = useCallback(
    (billable: Billable) => {
      setSelectedBillable(billable)
      let initialAmount = ""
      if (billable.amount != null) {
        initialAmount = String(billable.amount)
      } else if (billable.route_id) {
        const ratecard = masters.ratecards.find((r) => r.route_id === billable.route_id)
        if (ratecard) initialAmount = String(ratecard.base_fare)
      }
      setApproveAmount(initialAmount)
      setIsApproveDialogOpen(true)
    },
    [masters.ratecards]
  )

  // 実績承認 API を呼び出して一覧を最新化する
  const handleApprove = useCallback(async () => {
    if (!selectedBillable) return
    const amount = Number(approveAmount)
    if (!approveAmount.trim() || Number.isNaN(amount)) {
      toast.error("金額を入力してください")
      return
    }
    if (amount < 0) {
      toast.error("金額は 0 以上で入力してください")
      return
    }
    setProcessingKey(`billable:${selectedBillable.id}`)
    try {
      const res = await fetch(`/api/billable/${selectedBillable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", amount }),
      })
      const data = (await res.json()) as { error?: string }
      if (res.status === 403) { setIsApproveDialogOpen(false); return }
      if (!res.ok) throw new Error(getErrorMessage(data, "承認に失敗しました"))
      toast.success(`実績 ${selectedBillable.billable_id} を承認しました。`)
      setIsApproveDialogOpen(false)
      setSelectedBillable(null)
      await loadBillables(billableStatusFilter)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "承認に失敗しました")
    } finally {
      setProcessingKey("")
    }
  }, [approveAmount, billableStatusFilter, loadBillables, selectedBillable])

  // 実績無効化 API を呼び出して一覧を最新化する
  const handleVoid = useCallback(async () => {
    if (!billableToVoid) return
    setProcessingKey(`billable:${billableToVoid.id}`)
    try {
      const res = await fetch(`/api/billable/${billableToVoid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      })
      const data = (await res.json()) as { error?: string }
      if (res.status === 403) { return }
      if (!res.ok) throw new Error(getErrorMessage(data, "無効化に失敗しました"))
      toast.success(`実績 ${billableToVoid.billable_id} を無効にしました。`)
      setBillableToVoid(null)
      await loadBillables(billableStatusFilter)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "無効化に失敗しました")
    } finally {
      setProcessingKey("")
    }
  }, [billableStatusFilter, billableToVoid, loadBillables])

  // VOID 済み実績を削除する
  const handleDeleteBillable = useCallback(
    async (billable: Billable) => {
      if (!window.confirm(`実績 ${billable.billable_id} を削除します。よろしいですか？`)) return
      setProcessingKey(`billable:${billable.id}`)
      try {
        const res = await fetch(`/api/billable/${billable.id}`, { method: "DELETE" })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(getErrorMessage(data, "削除に失敗しました"))
        toast.success(`実績 ${billable.billable_id} を削除しました。`)
        await loadBillables(billableStatusFilter)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "削除に失敗しました")
      } finally {
        setProcessingKey("")
      }
    },
    [billableStatusFilter, loadBillables]
  )

  // 運行実績 CSV を指定期間でダウンロードする
  const handleBillableCsvDownload = useCallback(() => {
    const params = new URLSearchParams()
    if (billableExportFrom) params.set("from", billableExportFrom)
    if (billableExportTo) params.set("to", billableExportTo)
    window.location.href = `/api/export/billables?${params.toString()}`
  }, [billableExportFrom, billableExportTo])

  // 運行実績フィルタを初期値へ戻す
  const resetBillableFilters = useCallback(() => {
    setBillableStatusFilter(INITIAL_FILTER)
    setBillableEmpIdFilter("")
    setBillableRunDateFrom("")
    setBillableRunDateTo("")
  }, [])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>絞り込み</CardTitle>
          <CardDescription>初期表示は承認待ちです。必要に応じてステータスを切り替えてください。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full max-w-xs space-y-2">
              <Label>ステータス</Label>
              <Select
                value={billableStatusFilter}
                onValueChange={(value) => setBillableStatusFilter(value as BillableStatusFilter)}
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
                onChange={(e) => setBillableEmpIdFilter(e.target.value)}
                placeholder="部分一致で検索"
                disabled={isBusy}
              />
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="billable-run-date-from">運行日 From</Label>
              <Input
                id="billable-run-date-from"
                type="date"
                value={billableRunDateFrom}
                onChange={(e) => setBillableRunDateFrom(e.target.value)}
                disabled={isBusy}
              />
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="billable-run-date-to">運行日 To</Label>
              <Input
                id="billable-run-date-to"
                type="date"
                value={billableRunDateTo}
                onChange={(e) => setBillableRunDateTo(e.target.value)}
                disabled={isBusy}
              />
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="billable-export-from">期間 From</Label>
              <Input
                id="billable-export-from"
                type="date"
                value={billableExportFrom}
                onChange={(e) => setBillableExportFrom(e.target.value)}
              />
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="billable-export-to">期間 To</Label>
              <Input
                id="billable-export-to"
                type="date"
                value={billableExportTo}
                onChange={(e) => setBillableExportTo(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => void loadBillables(billableStatusFilter)} disabled={isBusy}>
              再読み込み
            </Button>
            <Button variant="ghost" onClick={resetBillableFilters} disabled={isBusy}>
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
          {isBusy ? (
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
                    const isReviewRequired = billable.status === "REVIEW_REQUIRED"
                    const isVoid = billable.status === "VOID"
                    const isProcessing = processingKey === `billable:${billable.id}`
                    return (
                      <TableRow key={billable.id}>
                        <TableCell>{formatDate(billable.run_date)}</TableCell>
                        <TableCell>{billable.emp_id ?? "-"}</TableCell>
                        <TableCell>
                          {billable.cust_id ? customerNameMap.get(billable.cust_id) ?? billable.cust_id : "-"}
                        </TableCell>
                        <TableCell>
                          {billable.route_id ? routeLabelMap.get(billable.route_id) ?? billable.route_id : "ルートなし"}
                        </TableCell>
                        <TableCell>{billable.pickup_loc ?? "-"}</TableCell>
                        <TableCell>{billable.drop_loc ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(billable.distance_km, { maximumFractionDigits: 1 })}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(billable.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={billable.status}>
                            {getBillableStatusLabel(billable.status)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {isReviewRequired ? (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => openApproveDialog(billable)} disabled={isProcessing}>
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
                          ) : isVoid ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleDeleteBillable(billable)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? "削除中..." : "削除"}
                            </Button>
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
        open={isApproveDialogOpen}
        onOpenChange={(open) => {
          if (processingKey) return
          setIsApproveDialogOpen(open)
          if (!open) setSelectedBillable(null)
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
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="例: 12000"
                disabled={!!processingKey}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsApproveDialogOpen(false); setSelectedBillable(null) }}
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

      <AlertDialog
        open={billableToVoid !== null}
        onOpenChange={(open) => { if (!open) setBillableToVoid(null) }}
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
              onClick={(e) => { e.preventDefault(); void handleVoid() }}
            >
              {processingKey ? "無効化中..." : "無効にする"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
