"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Truck } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

type Vehicle = {
  vehicle_id: string
  name: string
}

type Billable = {
  billable_id: string
  run_date: string | null
  cust_id: string | null
  route_id: string | null
  pickup_loc: string | null
  drop_loc: string | null
  status: string
  note: string | null
  depart_at: string | null
  arrive_at: string | null
  vehicle_id: string | null
  distance_km: number | null
  amount: number | null
  created_at?: string | null
}

type MasterResponse = {
  customers: Customer[]
  routes: Route[]
  vehicles: Vehicle[]
}

type FormState = {
  run_date: string
  cust_id: string
  route_choice: string
  pickup_loc: string
  drop_loc: string
  depart_at: string
  arrive_at: string
  vehicle_id: string
  distance_km: string
  note: string
}

type BillableStatusFilter = "ALL" | "REVIEW_REQUIRED" | "APPROVED"

const NO_ROUTE_VALUE = "__NO_ROUTE__"

function getStartOfDayValue(runDate: string) {
  return runDate ? `${runDate}T00:00` : ""
}

function createInitialFormState(runDate = new Date().toISOString().slice(0, 10)): FormState {
  return {
    run_date: runDate,
    cust_id: "",
    route_choice: "",
    pickup_loc: "",
    drop_loc: "",
    depart_at: getStartOfDayValue(runDate),
    arrive_at: "",
    vehicle_id: "",
    distance_km: "",
    note: "",
  }
}

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

// 日時を画面表示用に整える
function formatDateTime(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// 日付を画面表示用に整える
function formatDate(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString("ja-JP")
}

// 実績ステータスを日本語表示に変換する
function getStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "VOID") return "無効"
  return "確認待ち"
}

export default function HomePageClient() {
  const [masters, setMasters] = useState<MasterResponse>({
    customers: [],
    routes: [],
    vehicles: [],
  })
  const [billables, setBillables] = useState<Billable[]>([])
  const [form, setForm] = useState<FormState>(() => createInitialFormState())
  const [statusFilter, setStatusFilter] = useState<BillableStatusFilter>("ALL")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const customerNameMap = useMemo(() => {
    return new Map(masters.customers.map((customer) => [customer.cust_id, customer.name]))
  }, [masters.customers])

  const vehicleNameMap = useMemo(() => {
    return new Map(masters.vehicles.map((vehicle) => [vehicle.vehicle_id, vehicle.name]))
  }, [masters.vehicles])

  const selectedRoute = useMemo(() => {
    if (!form.route_choice || form.route_choice === NO_ROUTE_VALUE) {
      return null
    }

    return masters.routes.find((route) => route.route_id === form.route_choice) ?? null
  }, [form.route_choice, masters.routes])

  const routeOptions = useMemo(() => {
    if (!form.cust_id) {
      return masters.routes
    }

    return masters.routes.filter((route) => route.cust_id === form.cust_id)
  }, [form.cust_id, masters.routes])

  const filteredBillables = useMemo(() => {
    if (statusFilter === "ALL") {
      return billables
    }

    return billables.filter((billable) => billable.status === statusFilter)
  }, [billables, statusFilter])

  // 自分の実績一覧を取得する
  const loadBillables = useCallback(async () => {
    const response = await fetch("/api/billable", { cache: "no-store" })
    const data = (await response.json()) as Billable[] | { error?: string }

    if (!response.ok) {
      throw new Error(getErrorMessage(data, "実績一覧の取得に失敗しました"))
    }

    setBillables(Array.isArray(data) ? data : [])
  }, [])

  // 初期表示に必要なデータをまとめて取得する
  const loadInitialData = useCallback(async () => {
    setIsLoading(true)

    try {
      const [masterResponse, billableResponse] = await Promise.all([
        fetch("/api/master", { cache: "no-store" }),
        fetch("/api/billable", { cache: "no-store" }),
      ])

      const masterData = (await masterResponse.json()) as MasterResponse | { error?: string }
      const billableData = (await billableResponse.json()) as Billable[] | { error?: string }

      if (!masterResponse.ok) {
        throw new Error(getErrorMessage(masterData, "マスタ取得に失敗しました"))
      }

      if (!billableResponse.ok) {
        throw new Error(getErrorMessage(billableData, "実績一覧の取得に失敗しました"))
      }

      setMasters(masterData as MasterResponse)
      setBillables(Array.isArray(billableData) ? billableData : [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "画面の読み込みに失敗しました"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  // 入力項目を更新する
  const updateForm = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }))
    },
    []
  )

  // 荷主変更時にルートとの整合を保つ
  const handleCustomerChange = useCallback(
    (custId: string) => {
      setForm((current) => {
        const currentRoute =
          current.route_choice && current.route_choice !== NO_ROUTE_VALUE
            ? masters.routes.find((route) => route.route_id === current.route_choice) ?? null
            : null

        if (!currentRoute || currentRoute.cust_id === custId) {
          return { ...current, cust_id: custId }
        }

        return {
          ...current,
          cust_id: custId,
          route_choice: "",
          pickup_loc: "",
          drop_loc: "",
        }
      })
    },
    [masters.routes]
  )

  // ルート選択時に積み地・降ろし地を自動反映する
  const handleRouteChange = useCallback(
    (value: string) => {
      if (value === NO_ROUTE_VALUE) {
        setForm((current) => ({
          ...current,
          route_choice: value,
          pickup_loc: "",
          drop_loc: "",
        }))
        return
      }

      const route = masters.routes.find((item) => item.route_id === value)
      if (!route) {
        setForm((current) => ({
          ...current,
          route_choice: "",
        }))
        return
      }

      setForm((current) => ({
        ...current,
        cust_id: route.cust_id,
        route_choice: value,
        pickup_loc: route.pickup_default ?? "",
        drop_loc: route.drop_default ?? "",
      }))
    },
    [masters.routes]
  )

  // 運行日に合わせて出発時刻の既定値を更新する
  const handleRunDateChange = useCallback((value: string) => {
    setForm((current) => {
      const currentDefault = getStartOfDayValue(current.run_date)
      const nextDefault = getStartOfDayValue(value)

      return {
        ...current,
        run_date: value,
        depart_at:
          !current.depart_at || current.depart_at === currentDefault
            ? nextDefault
            : current.depart_at,
      }
    })
  }, [])

  // フォームを送信して一覧を更新する
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!form.run_date) {
        toast.error("運行日を入力してください")
        return
      }

      setIsSubmitting(true)

      try {
        const response = await fetch("/api/billable", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            run_date: form.run_date || null,
            cust_id: form.cust_id || null,
            route_id:
              form.route_choice && form.route_choice !== NO_ROUTE_VALUE
                ? form.route_choice
                : null,
            pickup_loc: form.pickup_loc || null,
            drop_loc: form.drop_loc || null,
            depart_at: form.depart_at ? new Date(form.depart_at).toISOString() : null,
            arrive_at: form.arrive_at ? new Date(form.arrive_at).toISOString() : null,
            vehicle_id: form.vehicle_id || null,
            distance_km: form.distance_km || null,
            note: form.note || null,
          }),
        })

        const data = (await response.json()) as { billable_id?: string; error?: string }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "実績の登録に失敗しました"))
        }

        await loadBillables()
        setForm(createInitialFormState(form.run_date))
        toast.success(
          data.billable_id
            ? `実績を登録しました（ID: ${data.billable_id}）`
            : "実績を登録しました"
        )
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "実績の登録に失敗しました"
        toast.error(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [form, loadBillables]
  )

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">運行実績入力</h1>
          <p className="text-sm text-muted-foreground">
            運行実績を登録すると、下の一覧に自分の履歴が反映されます。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>実績登録フォーム</CardTitle>
            <CardDescription>
              ルートを選ぶと、積み地・降ろし地の初期値が自動入力されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="run_date">運行日</Label>
                  <Input
                    id="run_date"
                    type="date"
                    value={form.run_date}
                    onChange={(event) => handleRunDateChange(event.target.value)}
                    disabled={isLoading || isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label>荷主</Label>
                  <Select
                    value={form.cust_id || undefined}
                    onValueChange={handleCustomerChange}
                    disabled={isLoading || isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="荷主を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {masters.customers.map((customer) => (
                        <SelectItem key={customer.cust_id} value={customer.cust_id}>
                          {customer.name} ({customer.cust_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ルート</Label>
                  <Select
                    value={form.route_choice || undefined}
                    onValueChange={handleRouteChange}
                    disabled={isLoading || isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="ルートを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ROUTE_VALUE}>ルートなし</SelectItem>
                      {routeOptions.map((route) => (
                        <SelectItem key={route.route_id} value={route.route_id}>
                          {route.route_id}
                          {customerNameMap.get(route.cust_id)
                            ? ` / ${customerNameMap.get(route.cust_id)}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickup_loc">積み地</Label>
                  <Input
                    id="pickup_loc"
                    value={form.pickup_loc}
                    placeholder={
                      selectedRoute ? "ルート既定値から編集できます" : "自由入力"
                    }
                    onChange={(event) => updateForm("pickup_loc", event.target.value)}
                    disabled={isLoading || isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drop_loc">降ろし地</Label>
                  <Input
                    id="drop_loc"
                    value={form.drop_loc}
                    placeholder={
                      selectedRoute ? "ルート既定値から編集できます" : "自由入力"
                    }
                    onChange={(event) => updateForm("drop_loc", event.target.value)}
                    disabled={isLoading || isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle_id">車両</Label>
                  <Select
                    value={form.vehicle_id || undefined}
                    onValueChange={(value) => updateForm("vehicle_id", value)}
                    disabled={isLoading || isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="車両を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {masters.vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                          {vehicle.name} ({vehicle.vehicle_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depart_at">出発時刻</Label>
                  <Input
                    id="depart_at"
                    type="datetime-local"
                    value={form.depart_at}
                    onChange={(event) => updateForm("depart_at", event.target.value)}
                    disabled={isLoading || isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrive_at">到着時刻</Label>
                  <Input
                    id="arrive_at"
                    type="datetime-local"
                    value={form.arrive_at}
                    onChange={(event) => updateForm("arrive_at", event.target.value)}
                    disabled={isLoading || isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distance_km">距離 km</Label>
                  <Input
                    id="distance_km"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={form.distance_km}
                    onChange={(event) => updateForm("distance_km", event.target.value)}
                    disabled={isLoading || isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">備考</Label>
                <textarea
                  id="note"
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={form.note}
                  placeholder="補足があれば入力してください"
                  onChange={(event) => updateForm("note", event.target.value)}
                  disabled={isLoading || isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  送信後に実績一覧を再取得して最新表示に更新します。
                </p>
                <Button type="submit" disabled={isLoading || isSubmitting}>
                  {isSubmitting ? "登録中..." : "実績を登録"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>自分の運行実績一覧</CardTitle>
            <CardDescription>
              最新 50 件を表示しています。ステータスで絞り込めます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={statusFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("ALL")}
                disabled={isLoading}
              >
                すべて
              </Button>
              <Button
                type="button"
                variant={statusFilter === "REVIEW_REQUIRED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("REVIEW_REQUIRED")}
                disabled={isLoading}
              >
                確認待ち
              </Button>
              <Button
                type="button"
                variant={statusFilter === "APPROVED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("APPROVED")}
                disabled={isLoading}
              >
                承認済み
              </Button>
            </div>

            {isLoading ? (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <TableSkeleton columns={10} rows={4} />
              </div>
            ) : filteredBillables.length === 0 ? (
              <EmptyState
                icon={Truck}
                description={
                  billables.length === 0
                    ? "上のフォームから最初の運行実績を登録してください"
                    : "条件に合う運行実績がありません。フィルタを切り替えて確認してください"
                }
              />
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>運行日</TableHead>
                      <TableHead>荷主</TableHead>
                      <TableHead>ルート</TableHead>
                      <TableHead>積み地 → 降ろし地</TableHead>
                      <TableHead>出発 / 到着</TableHead>
                      <TableHead>車両</TableHead>
                      <TableHead className="text-right">距離 km</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>備考</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBillables.map((billable) => (
                      <TableRow key={billable.billable_id}>
                        <TableCell>{formatDate(billable.run_date)}</TableCell>
                        <TableCell>
                          {billable.cust_id
                            ? customerNameMap.get(billable.cust_id) ?? billable.cust_id
                            : "-"}
                        </TableCell>
                        <TableCell>{billable.route_id ?? "ルートなし"}</TableCell>
                        <TableCell>
                          {(billable.pickup_loc ?? "-") + " → " + (billable.drop_loc ?? "-")}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(billable.depart_at)}
                          <br />
                          {formatDateTime(billable.arrive_at)}
                        </TableCell>
                        <TableCell>
                          {billable.vehicle_id
                            ? vehicleNameMap.get(billable.vehicle_id) ?? billable.vehicle_id
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {billable.distance_km ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {billable.status === "APPROVED"
                            ? formatCurrency(billable.amount)
                            : "－"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={billable.status}>
                            {getStatusLabel(billable.status)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="max-w-60 whitespace-normal">
                          {billable.note || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
