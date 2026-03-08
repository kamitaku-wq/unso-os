"use client"

import { useCallback, useEffect, useState } from "react"
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

type CustomerForm = {
  cust_id: string
  name: string
  address: string
}

type ApiError = {
  error?: string
}

type DeleteIntent = {
  id: string
  label: string
  path: string
}

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

const initialCustomerForm: CustomerForm = {
  cust_id: "",
  name: "",
  address: "",
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

// 荷主マスタの一覧表示・登録・編集・削除を担当するパネルコンポーネント
export function CustomerPanel() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerForm, setCustomerForm] = useState<CustomerForm>(initialCustomerForm)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<DeleteIntent | null>(null)

  const isMutating = busyKey !== null

  // 荷主一覧を取得する
  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await requestJson<Customer[]>(
        "/api/master/customers",
        undefined,
        "荷主一覧の取得に失敗しました"
      )
      setCustomers(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "荷主一覧の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  // 荷主新規登録を行う
  const handleCreateCustomer = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-customer")
      try {
        await requestJson<{ ok: true }>(
          "/api/master/customers",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cust_id: customerForm.cust_id.trim(),
              name: customerForm.name.trim(),
              address: customerForm.address.trim(),
            }),
          },
          "荷主の登録に失敗しました"
        )
        setCustomerForm(initialCustomerForm)
        toast.success("荷主を登録しました。")
        await loadCustomers()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "荷主の登録に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [customerForm, loadCustomers]
  )

  // 荷主更新を行う
  const handleUpdateCustomer = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingCustomer) return
      setBusyKey(`update-customer-${editingCustomer.id}`)
      try {
        await requestJson<{ ok: true }>(
          `/api/master/customers/${editingCustomer.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cust_id: editingCustomer.cust_id.trim(),
              name: editingCustomer.name.trim(),
              address: (editingCustomer.address ?? "").trim(),
            }),
          },
          "荷主の更新に失敗しました"
        )
        setEditingCustomer(null)
        toast.success("荷主を更新しました。")
        await loadCustomers()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "荷主の更新に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [editingCustomer, loadCustomers]
  )

  // 荷主削除を行う
  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    setBusyKey(`delete-customer-${pendingDelete.id}`)
    try {
      await requestJson<{ ok: true }>(
        pendingDelete.path,
        { method: "DELETE" },
        "荷主の削除に失敗しました"
      )
      setPendingDelete(null)
      toast.success("荷主を削除しました。")
      await loadCustomers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "荷主の削除に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }, [pendingDelete, loadCustomers])

  return (
    <>
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
                  onChange={(e) =>
                    setCustomerForm((c) => ({ ...c, cust_id: e.target.value }))
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
                  onChange={(e) =>
                    setCustomerForm((c) => ({ ...c, name: e.target.value }))
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
                  onChange={(e) =>
                    setCustomerForm((c) => ({ ...c, address: e.target.value }))
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
              {isLoading ? "最新データを表示します。" : `${customers.length}件を表示しています。`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={4} rows={4} />
            ) : customers.length === 0 ? (
              <EmptyState
                icon={Database}
                description="上のフォームから最初の荷主を登録してください"
              />
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
                              setPendingDelete({
                                id: customer.id,
                                label: `荷主「${customer.name}」`,
                                path: `/api/master/customers/${customer.id}`,
                              })
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

      <Dialog
        open={editingCustomer !== null}
        onOpenChange={(open) => { if (!open) setEditingCustomer(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>荷主を編集</DialogTitle>
            <DialogDescription>顧客コード、名称、住所を更新できます。</DialogDescription>
          </DialogHeader>
          {editingCustomer ? (
            <form className="space-y-4" onSubmit={handleUpdateCustomer}>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-cust-id">顧客コード</Label>
                <Input
                  id="edit-customer-cust-id"
                  value={editingCustomer.cust_id}
                  onChange={(e) =>
                    setEditingCustomer((c) => c ? { ...c, cust_id: e.target.value } : c)
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
                  onChange={(e) =>
                    setEditingCustomer((c) => c ? { ...c, name: e.target.value } : c)
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
                  onChange={(e) =>
                    setEditingCustomer((c) => c ? { ...c, address: e.target.value } : c)
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
