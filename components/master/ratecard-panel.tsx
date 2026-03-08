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
import { formatCurrency, getErrorMessage } from "@/lib/format"

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

type Ratecard = {
  id: string
  route_id: string
  cust_id: string
  base_fare: number
}

type RatecardForm = {
  route_id: string
  cust_id: string
  base_fare: string
}

type ApiError = {
  error?: string
}

type DeleteIntent = {
  id: string
  label: string
  path: string
}

const initialRatecardForm: RatecardForm = {
  route_id: "",
  cust_id: "",
  base_fare: "",
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

// 運賃マスタの一覧表示・登録・削除を担当するパネルコンポーネント
export function RatecardPanel() {
  const [ratecards, setRatecards] = useState<Ratecard[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<RouteMaster[]>([])
  const [ratecardForm, setRatecardForm] = useState<RatecardForm>(initialRatecardForm)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<DeleteIntent | null>(null)

  const isMutating = busyKey !== null

  const customerNameMap = useMemo(
    () => new Map(customers.map((c) => [c.cust_id, c.name])),
    [customers]
  )

  // 荷主・ルート・運賃をまとめて取得する
  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [customerData, routeData, ratecardData] = await Promise.all([
        requestJson<Customer[]>("/api/master/customers", undefined, "荷主一覧の取得に失敗しました"),
        requestJson<RouteMaster[]>("/api/master/routes", undefined, "ルート一覧の取得に失敗しました"),
        requestJson<Ratecard[]>("/api/master/ratecards", undefined, "運賃一覧の取得に失敗しました"),
      ])
      setCustomers(customerData)
      setRoutes(routeData)
      setRatecards(ratecardData)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "データの取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // 運賃新規登録を行う
  const handleCreateRatecard = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-ratecard")
      try {
        await requestJson<{ ok: true }>(
          "/api/master/ratecards",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              route_id: ratecardForm.route_id,
              cust_id: ratecardForm.cust_id,
              base_fare: Number(ratecardForm.base_fare),
            }),
          },
          "運賃の登録に失敗しました"
        )
        setRatecardForm(initialRatecardForm)
        toast.success("運賃を登録しました。")
        await loadAll()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "運賃の登録に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [ratecardForm, loadAll]
  )

  // 運賃削除を行う
  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    setBusyKey(`delete-ratecard-${pendingDelete.id}`)
    try {
      await requestJson<{ ok: true }>(
        pendingDelete.path,
        { method: "DELETE" },
        "運賃の削除に失敗しました"
      )
      setPendingDelete(null)
      toast.success("運賃を削除しました。")
      await loadAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "運賃の削除に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }, [pendingDelete, loadAll])

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>運賃の登録・更新</CardTitle>
            <CardDescription>
              ルートと荷主の組み合わせに基本運賃を設定します。同じ組み合わせは上書きされます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateRatecard}>
              <div className="space-y-2">
                <Label>ルート</Label>
                <Select
                  value={ratecardForm.route_id || undefined}
                  onValueChange={(value) =>
                    setRatecardForm((c) => ({ ...c, route_id: value }))
                  }
                  disabled={isLoading || isMutating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="ルートを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.route_id}>
                        {route.route_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>荷主</Label>
                <Select
                  value={ratecardForm.cust_id || undefined}
                  onValueChange={(value) =>
                    setRatecardForm((c) => ({ ...c, cust_id: value }))
                  }
                  disabled={isLoading || isMutating}
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
                <Label htmlFor="ratecard-base-fare">基本運賃（円）</Label>
                <Input
                  id="ratecard-base-fare"
                  type="number"
                  min="0"
                  value={ratecardForm.base_fare}
                  onChange={(e) =>
                    setRatecardForm((c) => ({ ...c, base_fare: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  required
                  placeholder="例: 15000"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isMutating || !ratecardForm.route_id || !ratecardForm.cust_id}
              >
                {busyKey === "create-ratecard" ? "登録中..." : "運賃を登録・更新"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>運賃一覧</CardTitle>
            <CardDescription>
              {isLoading ? "最新データを表示します。" : `${ratecards.length}件を表示しています。`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={4} rows={4} />
            ) : ratecards.length === 0 ? (
              <EmptyState
                icon={Database}
                description="上のフォームから最初の運賃を登録してください"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ルートコード</TableHead>
                    <TableHead>荷主</TableHead>
                    <TableHead>基本運賃</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratecards.map((ratecard) => (
                    <TableRow key={ratecard.id}>
                      <TableCell>{ratecard.route_id}</TableCell>
                      <TableCell>
                        {customerNameMap.get(ratecard.cust_id) ?? ratecard.cust_id}
                      </TableCell>
                      <TableCell>{formatCurrency(ratecard.base_fare)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isMutating}
                          onClick={() =>
                            setPendingDelete({
                              id: ratecard.id,
                              label: `運賃「${ratecard.route_id}」`,
                              path: `/api/master/ratecards/${ratecard.id}`,
                            })
                          }
                        >
                          削除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

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
