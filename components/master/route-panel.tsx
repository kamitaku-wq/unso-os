"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Database } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
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
import { getErrorMessage } from "@/lib/format"

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

type RouteForm = {
  route_id: string
  cust_id: string
  pickup_default: string
  drop_default: string
}

type ApiError = {
  error?: string
}

type DeleteIntent = {
  id: string
  label: string
  path: string
}

const initialRouteForm: RouteForm = {
  route_id: "",
  cust_id: "",
  pickup_default: "",
  drop_default: "",
}

// 共通の JSON API 呼び出しを行う
async function requestJson<T>(
  input: string,
  init: RequestInit | undefined,
  fallbackMessage: string
) {
  const response = await fetch(input, { cache: "no-store", ...init })
  const data = (await response.json()) as T | ApiError
  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallbackMessage))
  }
  return data as T
}

// ルートマスタの一覧表示・登録・編集・削除を担当するパネルコンポーネント
export function RoutePanel() {
  const [routes, setRoutes] = useState<RouteMaster[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routeForm, setRouteForm] = useState<RouteForm>(initialRouteForm)
  const [editingRoute, setEditingRoute] = useState<RouteMaster | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<DeleteIntent | null>(null)

  const isMutating = busyKey !== null

  const customerNameMap = useMemo(
    () => new Map(customers.map((c) => [c.cust_id, c.name])),
    [customers]
  )

  // ルート一覧を取得する
  const loadRoutes = useCallback(async () => {
    try {
      const data = await requestJson<RouteMaster[]>(
        "/api/master/routes",
        undefined,
        "ルート一覧の取得に失敗しました"
      )
      setRoutes(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ルート一覧の取得に失敗しました")
    }
  }, [])

  // 荷主一覧を取得する（ドロップダウン用）
  const loadCustomers = useCallback(async () => {
    try {
      const data = await requestJson<Customer[]>(
        "/api/master/customers",
        undefined,
        "荷主一覧の取得に失敗しました"
      )
      setCustomers(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "荷主一覧の取得に失敗しました")
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    void Promise.all([loadRoutes(), loadCustomers()]).finally(() => setIsLoading(false))
  }, [loadRoutes, loadCustomers])

  // ルート新規登録を行う
  const handleCreateRoute = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-route")
      try {
        await requestJson<{ ok: true }>(
          "/api/master/routes",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              route_id: routeForm.route_id.trim(),
              cust_id: routeForm.cust_id,
              pickup_default: routeForm.pickup_default.trim(),
              drop_default: routeForm.drop_default.trim(),
            }),
          },
          "ルートの登録に失敗しました"
        )
        setRouteForm(initialRouteForm)
        toast.success("ルートを登録しました。")
        await loadRoutes()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ルートの登録に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [routeForm, loadRoutes]
  )

  // ルート更新を行う
  const handleUpdateRoute = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingRoute) return
      setBusyKey(`update-route-${editingRoute.id}`)
      try {
        await requestJson<{ ok: true }>(
          `/api/master/routes/${editingRoute.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              route_id: editingRoute.route_id.trim(),
              cust_id: editingRoute.cust_id,
              pickup_default: (editingRoute.pickup_default ?? "").trim(),
              drop_default: (editingRoute.drop_default ?? "").trim(),
            }),
          },
          "ルートの更新に失敗しました"
        )
        setEditingRoute(null)
        toast.success("ルートを更新しました。")
        await loadRoutes()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ルートの更新に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [editingRoute, loadRoutes]
  )

  // ルート削除を行う
  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    setBusyKey(`delete-route-${pendingDelete.id}`)
    try {
      await requestJson<{ ok: true }>(
        pendingDelete.path,
        { method: "DELETE" },
        "ルートの削除に失敗しました"
      )
      setPendingDelete(null)
      toast.success("ルートを削除しました。")
      await loadRoutes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ルートの削除に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }, [pendingDelete, loadRoutes])

  return (
    <>
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
                  onChange={(e) =>
                    setRouteForm((c) => ({ ...c, route_id: e.target.value }))
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
                    setRouteForm((c) => ({ ...c, cust_id: value }))
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
                  onChange={(e) =>
                    setRouteForm((c) => ({ ...c, pickup_default: e.target.value }))
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
                  onChange={(e) =>
                    setRouteForm((c) => ({ ...c, drop_default: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  placeholder="任意"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isMutating || customers.length === 0 || !routeForm.cust_id}
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
              {isLoading ? "最新データを表示します。" : `${routes.length}件を表示しています。`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={5} rows={4} />
            ) : routes.length === 0 ? (
              <EmptyState
                icon={Database}
                description="上のフォームから最初のルートを登録してください"
              />
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
                              setPendingDelete({
                                id: route.id,
                                label: `ルート「${route.route_id}」`,
                                path: `/api/master/routes/${route.id}`,
                              })
                            }
                          >
                            {busyKey === `delete-route-${route.id}` ? "削除中..." : "削除"}
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

      <Dialog
        open={editingRoute !== null}
        onOpenChange={(open) => { if (!open) setEditingRoute(null) }}
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
                  onChange={(e) =>
                    setEditingRoute((c) => c ? { ...c, route_id: e.target.value } : c)
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
                    setEditingRoute((c) => c ? { ...c, cust_id: value } : c)
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
                  onChange={(e) =>
                    setEditingRoute((c) => c ? { ...c, pickup_default: e.target.value } : c)
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
                  onChange={(e) =>
                    setEditingRoute((c) => c ? { ...c, drop_default: e.target.value } : c)
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

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.label} を削除すると元に戻せません。`
                : "削除すると元に戻せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={(e) => { e.preventDefault(); void handleDelete() }}
            >
              {isMutating ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
