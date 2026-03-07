"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

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

type MasterTab = "customers" | "routes" | "expenseCategories" | "vehicles"

type ApiError = {
  error?: string
}

type Customer = {
  id: string
  cust_id: string
  name: string
  address: string | null
}

type RouteMaster = {
  id: string
  route_id: string
  cust_id: string
  pickup_default: string | null
  drop_default: string | null
}

type ExpenseCategory = {
  id: string
  category_id: string
  name: string
  is_active: boolean
  note: string | null
}

type Vehicle = {
  id: string
  vehicle_id: string
  name: string
  plate_no: string | null
  vehicle_type: string | null
  capacity_ton: number | null
  is_active: boolean
  memo: string | null
}

type CustomerForm = {
  cust_id: string
  name: string
  address: string
}

type RouteForm = {
  route_id: string
  cust_id: string
  pickup_default: string
  drop_default: string
}

type ExpenseCategoryForm = {
  category_id: string
  name: string
  note: string
}

type VehicleForm = {
  vehicle_id: string
  name: string
  plate_no: string
  vehicle_type: string
  capacity_ton: string
  memo: string
}

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

const initialCustomerForm: CustomerForm = {
  cust_id: "",
  name: "",
  address: "",
}

const initialRouteForm: RouteForm = {
  route_id: "",
  cust_id: "",
  pickup_default: "",
  drop_default: "",
}

const initialExpenseCategoryForm: ExpenseCategoryForm = {
  category_id: "",
  name: "",
  note: "",
}

const initialVehicleForm: VehicleForm = {
  vehicle_id: "",
  name: "",
  plate_no: "",
  vehicle_type: "",
  capacity_ton: "",
  memo: "",
}

// API 応答からユーザー向けエラー文言を取り出す
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

// 空欄を API 送信用の空文字に整える
function normalizeOptionalValue(value: string) {
  return value.trim()
}

// 数値入力を表示用の文字列に変換する
function formatCapacity(value: number | null) {
  if (value === null) return "-"
  return `${value}t`
}

// 車両の稼働状態を日本語表示に変換する
function getVehicleStatusLabel(isActive: boolean) {
  return isActive ? "稼働中" : "停止"
}

// 共通の JSON API 呼び出しを行う
async function requestJson<T>(
  input: string,
  init: RequestInit | undefined,
  fallbackMessage: string
) {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
  })
  const data = (await response.json()) as T | ApiError

  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallbackMessage))
  }

  return data as T
}

export default function MasterPage() {
  const [activeTab, setActiveTab] = useState<MasterTab>("customers")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<RouteMaster[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customerForm, setCustomerForm] = useState<CustomerForm>(initialCustomerForm)
  const [routeForm, setRouteForm] = useState<RouteForm>(initialRouteForm)
  const [expenseCategoryForm, setExpenseCategoryForm] = useState<ExpenseCategoryForm>(
    initialExpenseCategoryForm
  )
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(initialVehicleForm)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingRoute, setEditingRoute] = useState<RouteMaster | null>(null)
  const [editingExpenseCategory, setEditingExpenseCategory] =
    useState<ExpenseCategory | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [pageError, setPageError] = useState("")
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [hasNoPermission, setHasNoPermission] = useState(false)

  const isMutating = busyKey !== null

  const customerNameMap = useMemo(() => {
    return new Map(customers.map((customer) => [customer.cust_id, customer.name]))
  }, [customers])

  useEffect(() => {
    if (pageError) {
      toast.error(pageError)
    }
  }, [pageError])

  useEffect(() => {
    if (submitMessage) {
      toast.success(submitMessage)
    }
  }, [submitMessage])

  useEffect(() => {
    if (hasNoPermission) {
      toast.error("権限がありません")
    }
  }, [hasNoPermission])

  // 画面表示に必要なマスタをまとめて再取得する
  const loadAllMasters = useCallback(async () => {
    setIsLoading(true)
    setPageError("")

    try {
      const [customerData, routeData, expenseCategoryData, vehicleData] = await Promise.all([
        requestJson<Customer[]>(
          "/api/master/customers",
          undefined,
          "荷主一覧の取得に失敗しました"
        ),
        requestJson<RouteMaster[]>(
          "/api/master/routes",
          undefined,
          "ルート一覧の取得に失敗しました"
        ),
        requestJson<ExpenseCategory[]>(
          "/api/master/expense-categories",
          undefined,
          "経費区分一覧の取得に失敗しました"
        ),
        requestJson<Vehicle[]>(
          "/api/master/vehicles",
          undefined,
          "車両一覧の取得に失敗しました"
        ),
      ])

      setCustomers(customerData)
      setRoutes(routeData)
      setExpenseCategories(expenseCategoryData)
      setVehicles(vehicleData)
      setHasNoPermission(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "マスタ一覧の取得に失敗しました"
      if (message === "権限がありません") {
        setHasNoPermission(true)
        setPageError("")
      } else {
        setPageError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAllMasters()
  }, [loadAllMasters])

  // 成功メッセージを表示しながらマスタ再取得を行う
  const refreshAfterMutation = useCallback(
    async (message: string) => {
      await loadAllMasters()
      setSubmitMessage(message)
    },
    [loadAllMasters]
  )

  // 荷主新規登録を行う
  const handleCreateCustomer = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-customer")
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          "/api/master/customers",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cust_id: customerForm.cust_id.trim(),
              name: customerForm.name.trim(),
              address: normalizeOptionalValue(customerForm.address),
            }),
          },
          "荷主の登録に失敗しました"
        )

        setCustomerForm(initialCustomerForm)
        await refreshAfterMutation("荷主を登録しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "荷主の登録に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [customerForm, refreshAfterMutation]
  )

  // ルート新規登録を行う
  const handleCreateRoute = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-route")
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          "/api/master/routes",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route_id: routeForm.route_id.trim(),
              cust_id: routeForm.cust_id,
              pickup_default: normalizeOptionalValue(routeForm.pickup_default),
              drop_default: normalizeOptionalValue(routeForm.drop_default),
            }),
          },
          "ルートの登録に失敗しました"
        )

        setRouteForm(initialRouteForm)
        await refreshAfterMutation("ルートを登録しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ルートの登録に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [refreshAfterMutation, routeForm]
  )

  // 経費区分新規登録を行う
  const handleCreateExpenseCategory = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-expense-category")
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          "/api/master/expense-categories",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              category_id: expenseCategoryForm.category_id.trim(),
              name: expenseCategoryForm.name.trim(),
              note: normalizeOptionalValue(expenseCategoryForm.note),
            }),
          },
          "経費区分の登録に失敗しました"
        )

        setExpenseCategoryForm(initialExpenseCategoryForm)
        await refreshAfterMutation("経費区分を登録しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "経費区分の登録に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [expenseCategoryForm, refreshAfterMutation]
  )

  // 車両新規登録を行う
  const handleCreateVehicle = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-vehicle")
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          "/api/master/vehicles",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vehicle_id: vehicleForm.vehicle_id.trim(),
              name: vehicleForm.name.trim(),
              plate_no: normalizeOptionalValue(vehicleForm.plate_no),
              vehicle_type: normalizeOptionalValue(vehicleForm.vehicle_type),
              capacity_ton: normalizeOptionalValue(vehicleForm.capacity_ton),
              memo: normalizeOptionalValue(vehicleForm.memo),
            }),
          },
          "車両の登録に失敗しました"
        )

        setVehicleForm(initialVehicleForm)
        await refreshAfterMutation("車両を登録しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "車両の登録に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [refreshAfterMutation, vehicleForm]
  )

  // 荷主更新を行う
  const handleUpdateCustomer = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingCustomer) return

      setBusyKey(`update-customer-${editingCustomer.id}`)
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          `/api/master/customers/${editingCustomer.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cust_id: editingCustomer.cust_id.trim(),
              name: editingCustomer.name.trim(),
              address: normalizeOptionalValue(editingCustomer.address ?? ""),
            }),
          },
          "荷主の更新に失敗しました"
        )

        setEditingCustomer(null)
        await refreshAfterMutation("荷主を更新しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "荷主の更新に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [editingCustomer, refreshAfterMutation]
  )

  // ルート更新を行う
  const handleUpdateRoute = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingRoute) return

      setBusyKey(`update-route-${editingRoute.id}`)
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          `/api/master/routes/${editingRoute.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route_id: editingRoute.route_id.trim(),
              cust_id: editingRoute.cust_id,
              pickup_default: normalizeOptionalValue(
                editingRoute.pickup_default ?? ""
              ),
              drop_default: normalizeOptionalValue(editingRoute.drop_default ?? ""),
            }),
          },
          "ルートの更新に失敗しました"
        )

        setEditingRoute(null)
        await refreshAfterMutation("ルートを更新しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ルートの更新に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [editingRoute, refreshAfterMutation]
  )

  // 経費区分更新を行う
  const handleUpdateExpenseCategory = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingExpenseCategory) return

      setBusyKey(`update-expense-category-${editingExpenseCategory.id}`)
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          `/api/master/expense-categories/${editingExpenseCategory.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              category_id: editingExpenseCategory.category_id.trim(),
              name: editingExpenseCategory.name.trim(),
              note: normalizeOptionalValue(editingExpenseCategory.note ?? ""),
            }),
          },
          "経費区分の更新に失敗しました"
        )

        setEditingExpenseCategory(null)
        await refreshAfterMutation("経費区分を更新しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "経費区分の更新に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [editingExpenseCategory, refreshAfterMutation]
  )

  // 車両更新を行う
  const handleUpdateVehicle = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingVehicle) return

      setBusyKey(`update-vehicle-${editingVehicle.id}`)
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          `/api/master/vehicles/${editingVehicle.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vehicle_id: editingVehicle.vehicle_id.trim(),
              name: editingVehicle.name.trim(),
              plate_no: normalizeOptionalValue(editingVehicle.plate_no ?? ""),
              vehicle_type: normalizeOptionalValue(editingVehicle.vehicle_type ?? ""),
              capacity_ton: normalizeOptionalValue(
                editingVehicle.capacity_ton?.toString() ?? ""
              ),
              memo: normalizeOptionalValue(editingVehicle.memo ?? ""),
            }),
          },
          "車両の更新に失敗しました"
        )

        setEditingVehicle(null)
        await refreshAfterMutation("車両を更新しました。")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "車両の更新に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [editingVehicle, refreshAfterMutation]
  )

  // 対象行の削除を行う
  const handleDelete = useCallback(
    async (path: string, label: string, busyLabel: string, message: string) => {
      if (!window.confirm(`${label}を削除します。よろしいですか？`)) {
        return
      }

      setBusyKey(busyLabel)
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          path,
          {
            method: "DELETE",
          },
          `${label}の削除に失敗しました`
        )

        await refreshAfterMutation(message)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `${label}の削除に失敗しました`
        setPageError(errorMessage)
      } finally {
        setBusyKey(null)
      }
    },
    [refreshAfterMutation]
  )

  // 車両の稼働状態を切り替える
  const handleToggleVehicleStatus = useCallback(
    async (vehicle: Vehicle) => {
      setBusyKey(`toggle-vehicle-${vehicle.id}`)
      setPageError("")
      setSubmitMessage("")

      try {
        await requestJson<{ ok: true }>(
          `/api/master/vehicles/${vehicle.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              is_active: !vehicle.is_active,
            }),
          },
          "車両の稼働状態更新に失敗しました"
        )

        await refreshAfterMutation(
          `車両を${!vehicle.is_active ? "稼働中" : "停止"}に変更しました。`
        )
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "車両の稼働状態更新に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [refreshAfterMutation]
  )

  if (hasNoPermission) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">マスタ管理</h1>
            <p className="text-sm text-muted-foreground">
              荷主・ルート・経費区分・車両をタブで切り替えて登録、編集、削除できます。
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                この画面を表示する権限がありません。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">マスタ管理</h1>
          <p className="text-sm text-muted-foreground">
            荷主・ルート・経費区分・車両をタブで切り替えて登録、編集、削除できます。
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>管理対象</CardTitle>
              <CardDescription>
                画面上部のタブで対象マスタを切り替えます。
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={activeTab === "customers" ? "default" : "outline"}
                onClick={() => setActiveTab("customers")}
              >
                荷主
              </Button>
              <Button
                type="button"
                variant={activeTab === "routes" ? "default" : "outline"}
                onClick={() => setActiveTab("routes")}
              >
                ルート
              </Button>
              <Button
                type="button"
                variant={activeTab === "expenseCategories" ? "default" : "outline"}
                onClick={() => setActiveTab("expenseCategories")}
              >
                経費区分
              </Button>
              <Button
                type="button"
                variant={activeTab === "vehicles" ? "default" : "outline"}
                onClick={() => setActiveTab("vehicles")}
              >
                車両
              </Button>
            </div>
          </CardHeader>
        </Card>

        {activeTab === "customers" ? (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>荷主の新規登録</CardTitle>
                <CardDescription>
                  顧客コードと名称は必須です。住所は任意で登録できます。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateCustomer}>
                  <div className="space-y-2">
                    <Label htmlFor="customer-cust-id">顧客コード</Label>
                    <Input
                      id="customer-cust-id"
                      value={customerForm.cust_id}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          cust_id: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-name">名称</Label>
                    <Input
                      id="customer-name"
                      value={customerForm.name}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-address">住所</Label>
                    <textarea
                      id="customer-address"
                      className={TEXTAREA_CLASS}
                      value={customerForm.address}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isMutating}
                  >
                    {busyKey === "create-customer" ? "登録中..." : "荷主を登録"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>荷主一覧</CardTitle>
                <CardDescription>
                  {isLoading ? "読み込み中です..." : `${customers.length}件を表示しています。`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    荷主データを読み込み中です...
                  </div>
                ) : customers.length === 0 ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    まだ荷主は登録されていません。
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>顧客コード</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>住所</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>{customer.cust_id}</TableCell>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell className="max-w-80 whitespace-normal">
                            {customer.address || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isMutating}
                                onClick={() => setEditingCustomer(customer)}
                              >
                                編集
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleDelete(
                                    `/api/master/customers/${customer.id}`,
                                    `荷主「${customer.name}」`,
                                    `delete-customer-${customer.id}`,
                                    "荷主を削除しました。"
                                  )
                                }
                              >
                                {busyKey === `delete-customer-${customer.id}`
                                  ? "削除中..."
                                  : "削除"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "routes" ? (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>ルートの新規登録</CardTitle>
                <CardDescription>
                  ルートコードと荷主コードは必須です。積み地と降ろし地は任意です。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateRoute}>
                  <div className="space-y-2">
                    <Label htmlFor="route-id">ルートコード</Label>
                    <Input
                      id="route-id"
                      value={routeForm.route_id}
                      onChange={(event) =>
                        setRouteForm((current) => ({
                          ...current,
                          route_id: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>荷主コード</Label>
                    <Select
                      value={routeForm.cust_id || undefined}
                      onValueChange={(value) =>
                        setRouteForm((current) => ({
                          ...current,
                          cust_id: value,
                        }))
                      }
                      disabled={isLoading || isMutating || customers.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            customers.length === 0
                              ? "先に荷主を登録してください"
                              : "荷主を選択"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.cust_id}>
                            {customer.name} ({customer.cust_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pickup-default">積み地</Label>
                    <Input
                      id="pickup-default"
                      value={routeForm.pickup_default}
                      onChange={(event) =>
                        setRouteForm((current) => ({
                          ...current,
                          pickup_default: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="drop-default">降ろし地</Label>
                    <Input
                      id="drop-default"
                      value={routeForm.drop_default}
                      onChange={(event) =>
                        setRouteForm((current) => ({
                          ...current,
                          drop_default: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isLoading || isMutating || customers.length === 0 || !routeForm.cust_id
                    }
                  >
                    {busyKey === "create-route" ? "登録中..." : "ルートを登録"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ルート一覧</CardTitle>
                <CardDescription>
                  {isLoading ? "読み込み中です..." : `${routes.length}件を表示しています。`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    ルートデータを読み込み中です...
                  </div>
                ) : routes.length === 0 ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    まだルートは登録されていません。
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ルートコード</TableHead>
                        <TableHead>荷主</TableHead>
                        <TableHead>積み地</TableHead>
                        <TableHead>降ろし地</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell>{route.route_id}</TableCell>
                          <TableCell>
                            {customerNameMap.get(route.cust_id)
                              ? `${customerNameMap.get(route.cust_id)} (${route.cust_id})`
                              : route.cust_id}
                          </TableCell>
                          <TableCell>{route.pickup_default || "-"}</TableCell>
                          <TableCell>{route.drop_default || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isMutating}
                                onClick={() => setEditingRoute(route)}
                              >
                                編集
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleDelete(
                                    `/api/master/routes/${route.id}`,
                                    `ルート「${route.route_id}」`,
                                    `delete-route-${route.id}`,
                                    "ルートを削除しました。"
                                  )
                                }
                              >
                                {busyKey === `delete-route-${route.id}`
                                  ? "削除中..."
                                  : "削除"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "expenseCategories" ? (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>経費区分の新規登録</CardTitle>
                <CardDescription>
                  区分コードと名称は必須です。備考は任意で登録できます。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateExpenseCategory}>
                  <div className="space-y-2">
                    <Label htmlFor="expense-category-id">区分コード</Label>
                    <Input
                      id="expense-category-id"
                      value={expenseCategoryForm.category_id}
                      onChange={(event) =>
                        setExpenseCategoryForm((current) => ({
                          ...current,
                          category_id: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-category-name">名称</Label>
                    <Input
                      id="expense-category-name"
                      value={expenseCategoryForm.name}
                      onChange={(event) =>
                        setExpenseCategoryForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-category-note">備考</Label>
                    <textarea
                      id="expense-category-note"
                      className={TEXTAREA_CLASS}
                      value={expenseCategoryForm.note}
                      onChange={(event) =>
                        setExpenseCategoryForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isMutating}
                  >
                    {busyKey === "create-expense-category"
                      ? "登録中..."
                      : "経費区分を登録"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>経費区分一覧</CardTitle>
                <CardDescription>
                  {isLoading
                    ? "読み込み中です..."
                    : `${expenseCategories.length}件を表示しています。`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    経費区分データを読み込み中です...
                  </div>
                ) : expenseCategories.length === 0 ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    まだ経費区分は登録されていません。
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>区分コード</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>備考</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseCategories.map((expenseCategory) => (
                        <TableRow key={expenseCategory.id}>
                          <TableCell>{expenseCategory.category_id}</TableCell>
                          <TableCell>{expenseCategory.name}</TableCell>
                          <TableCell className="max-w-80 whitespace-normal">
                            {expenseCategory.note || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isMutating}
                                onClick={() => setEditingExpenseCategory(expenseCategory)}
                              >
                                編集
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleDelete(
                                    `/api/master/expense-categories/${expenseCategory.id}`,
                                    `経費区分「${expenseCategory.name}」`,
                                    `delete-expense-category-${expenseCategory.id}`,
                                    "経費区分を削除しました。"
                                  )
                                }
                              >
                                {busyKey ===
                                `delete-expense-category-${expenseCategory.id}`
                                  ? "削除中..."
                                  : "削除"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "vehicles" ? (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>車両の新規登録</CardTitle>
                <CardDescription>
                  車両コードと名称は必須です。その他は任意で登録できます。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateVehicle}>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-code">車両コード</Label>
                    <Input
                      id="vehicle-code"
                      value={vehicleForm.vehicle_id}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          vehicle_id: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-name">名称</Label>
                    <Input
                      id="vehicle-name"
                      value={vehicleForm.name}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-plate">ナンバー</Label>
                    <Input
                      id="vehicle-plate"
                      value={vehicleForm.plate_no}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          plate_no: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-type">種別</Label>
                    <Input
                      id="vehicle-type"
                      value={vehicleForm.vehicle_type}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          vehicle_type: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-capacity">積載量（トン）</Label>
                    <Input
                      id="vehicle-capacity"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={vehicleForm.capacity_ton}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          capacity_ton: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-memo">メモ</Label>
                    <textarea
                      id="vehicle-memo"
                      className={TEXTAREA_CLASS}
                      value={vehicleForm.memo}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          memo: event.target.value,
                        }))
                      }
                      disabled={isLoading || isMutating}
                      placeholder="任意"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isMutating}
                  >
                    {busyKey === "create-vehicle" ? "登録中..." : "車両を登録"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>車両一覧</CardTitle>
                <CardDescription>
                  {isLoading ? "読み込み中です..." : `${vehicles.length}件を表示しています。`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    車両データを読み込み中です...
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="py-8 text-sm text-muted-foreground">
                    まだ車両は登録されていません。
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>車両コード</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>ナンバー</TableHead>
                        <TableHead>種別</TableHead>
                        <TableHead>積載量</TableHead>
                        <TableHead>稼働状態</TableHead>
                        <TableHead>メモ</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell>{vehicle.vehicle_id}</TableCell>
                          <TableCell>{vehicle.name}</TableCell>
                          <TableCell>{vehicle.plate_no || "-"}</TableCell>
                          <TableCell>{vehicle.vehicle_type || "-"}</TableCell>
                          <TableCell>{formatCapacity(vehicle.capacity_ton)}</TableCell>
                          <TableCell>
                            <Badge variant={vehicle.is_active ? "default" : "outline"}>
                              {getVehicleStatusLabel(vehicle.is_active)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-72 whitespace-normal">
                            {vehicle.memo || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={isMutating}
                                onClick={() => void handleToggleVehicleStatus(vehicle)}
                              >
                                {busyKey === `toggle-vehicle-${vehicle.id}`
                                  ? "更新中..."
                                  : vehicle.is_active
                                    ? "停止にする"
                                    : "稼働中にする"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isMutating}
                                onClick={() => setEditingVehicle(vehicle)}
                              >
                                編集
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleDelete(
                                    `/api/master/vehicles/${vehicle.id}`,
                                    `車両「${vehicle.name}」`,
                                    `delete-vehicle-${vehicle.id}`,
                                    "車両を削除しました。"
                                  )
                                }
                              >
                                {busyKey === `delete-vehicle-${vehicle.id}`
                                  ? "削除中..."
                                  : "削除"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      <Dialog
        open={editingCustomer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCustomer(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>荷主を編集</DialogTitle>
            <DialogDescription>
              顧客コード、名称、住所を更新できます。
            </DialogDescription>
          </DialogHeader>
          {editingCustomer ? (
            <form className="space-y-4" onSubmit={handleUpdateCustomer}>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-cust-id">顧客コード</Label>
                <Input
                  id="edit-customer-cust-id"
                  value={editingCustomer.cust_id}
                  onChange={(event) =>
                    setEditingCustomer((current) =>
                      current
                        ? {
                            ...current,
                            cust_id: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-customer-name">名称</Label>
                <Input
                  id="edit-customer-name"
                  value={editingCustomer.name}
                  onChange={(event) =>
                    setEditingCustomer((current) =>
                      current
                        ? {
                            ...current,
                            name: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-customer-address">住所</Label>
                <textarea
                  id="edit-customer-address"
                  className={TEXTAREA_CLASS}
                  value={editingCustomer.address ?? ""}
                  onChange={(event) =>
                    setEditingCustomer((current) =>
                      current
                        ? {
                            ...current,
                            address: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCustomer(null)}
                  disabled={isMutating}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {busyKey?.startsWith("update-customer-") ? "更新中..." : "更新する"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingRoute !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRoute(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ルートを編集</DialogTitle>
            <DialogDescription>
              ルートコード、荷主、積み地、降ろし地を更新できます。
            </DialogDescription>
          </DialogHeader>
          {editingRoute ? (
            <form className="space-y-4" onSubmit={handleUpdateRoute}>
              <div className="space-y-2">
                <Label htmlFor="edit-route-id">ルートコード</Label>
                <Input
                  id="edit-route-id"
                  value={editingRoute.route_id}
                  onChange={(event) =>
                    setEditingRoute((current) =>
                      current
                        ? {
                            ...current,
                            route_id: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>荷主コード</Label>
                <Select
                  value={editingRoute.cust_id}
                  onValueChange={(value) =>
                    setEditingRoute((current) =>
                      current
                        ? {
                            ...current,
                            cust_id: value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating || customers.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="荷主を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.cust_id}>
                        {customer.name} ({customer.cust_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-route-pickup">積み地</Label>
                <Input
                  id="edit-route-pickup"
                  value={editingRoute.pickup_default ?? ""}
                  onChange={(event) =>
                    setEditingRoute((current) =>
                      current
                        ? {
                            ...current,
                            pickup_default: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-route-drop">降ろし地</Label>
                <Input
                  id="edit-route-drop"
                  value={editingRoute.drop_default ?? ""}
                  onChange={(event) =>
                    setEditingRoute((current) =>
                      current
                        ? {
                            ...current,
                            drop_default: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingRoute(null)}
                  disabled={isMutating}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {busyKey?.startsWith("update-route-") ? "更新中..." : "更新する"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingExpenseCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExpenseCategory(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費区分を編集</DialogTitle>
            <DialogDescription>
              区分コード、名称、備考を更新できます。
            </DialogDescription>
          </DialogHeader>
          {editingExpenseCategory ? (
            <form className="space-y-4" onSubmit={handleUpdateExpenseCategory}>
              <div className="space-y-2">
                <Label htmlFor="edit-expense-category-id">区分コード</Label>
                <Input
                  id="edit-expense-category-id"
                  value={editingExpenseCategory.category_id}
                  onChange={(event) =>
                    setEditingExpenseCategory((current) =>
                      current
                        ? {
                            ...current,
                            category_id: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-expense-category-name">名称</Label>
                <Input
                  id="edit-expense-category-name"
                  value={editingExpenseCategory.name}
                  onChange={(event) =>
                    setEditingExpenseCategory((current) =>
                      current
                        ? {
                            ...current,
                            name: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-expense-category-note">備考</Label>
                <textarea
                  id="edit-expense-category-note"
                  className={TEXTAREA_CLASS}
                  value={editingExpenseCategory.note ?? ""}
                  onChange={(event) =>
                    setEditingExpenseCategory((current) =>
                      current
                        ? {
                            ...current,
                            note: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingExpenseCategory(null)}
                  disabled={isMutating}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {busyKey?.startsWith("update-expense-category-")
                    ? "更新中..."
                    : "更新する"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingVehicle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVehicle(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>車両を編集</DialogTitle>
            <DialogDescription>
              車両情報を更新できます。稼働状態は一覧のボタンから切り替えます。
            </DialogDescription>
          </DialogHeader>
          {editingVehicle ? (
            <form className="space-y-4" onSubmit={handleUpdateVehicle}>
              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-id">車両コード</Label>
                <Input
                  id="edit-vehicle-id"
                  value={editingVehicle.vehicle_id}
                  onChange={(event) =>
                    setEditingVehicle((current) =>
                      current
                        ? {
                            ...current,
                            vehicle_id: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-name">名称</Label>
                <Input
                  id="edit-vehicle-name"
                  value={editingVehicle.name}
                  onChange={(event) =>
                    setEditingVehicle((current) =>
                      current
                        ? {
                            ...current,
                            name: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-plate">ナンバー</Label>
                <Input
                  id="edit-vehicle-plate"
                  value={editingVehicle.plate_no ?? ""}
                  onChange={(event) =>
                    setEditingVehicle((current) =>
                      current
                        ? {
                            ...current,
                            plate_no: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-type">種別</Label>
                <Input
                  id="edit-vehicle-type"
                  value={editingVehicle.vehicle_type ?? ""}
                  onChange={(event) =>
                    setEditingVehicle((current) =>
                      current
                        ? {
                            ...current,
                            vehicle_type: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-capacity">積載量（トン）</Label>
                <Input
                  id="edit-vehicle-capacity"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={editingVehicle.capacity_ton?.toString() ?? ""}
                  onChange={(event) =>
                    setEditingVehicle((current) =>
                      current
                        ? {
                            ...current,
                            capacity_ton: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-memo">メモ</Label>
                <textarea
                  id="edit-vehicle-memo"
                  className={TEXTAREA_CLASS}
                  value={editingVehicle.memo ?? ""}
                  onChange={(event) =>
                    setEditingVehicle((current) =>
                      current
                        ? {
                            ...current,
                            memo: event.target.value,
                          }
                        : current
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingVehicle(null)}
                  disabled={isMutating}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {busyKey?.startsWith("update-vehicle-") ? "更新中..." : "更新する"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  )
}
