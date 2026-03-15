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

type ExpenseCategory = {
  id: string
  category_id: string
  name: string
  is_active: boolean
  note: string | null
}

type ExpenseCategoryForm = {
  category_id: string
  name: string
  note: string
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

const initialExpenseCategoryForm: ExpenseCategoryForm = {
  category_id: "",
  name: "",
  note: "",
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

// 経費区分マスタの一覧表示・登録・編集・削除を担当するパネルコンポーネント
export function ExpenseCategoryPanel() {
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [expenseCategoryForm, setExpenseCategoryForm] = useState<ExpenseCategoryForm>(
    initialExpenseCategoryForm
  )
  const [editingExpenseCategory, setEditingExpenseCategory] = useState<ExpenseCategory | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<DeleteIntent | null>(null)

  const isMutating = busyKey !== null

  // 経費区分一覧を取得する
  const loadExpenseCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await requestJson<ExpenseCategory[]>(
        "/api/master/expense-categories",
        undefined,
        "経費区分一覧の取得に失敗しました"
      )
      setExpenseCategories(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "経費区分一覧の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadExpenseCategories()
  }, [loadExpenseCategories])

  // 経費区分新規登録を行う
  const handleCreateExpenseCategory = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-expense-category")
      try {
        await requestJson<{ ok: true }>(
          "/api/master/expense-categories",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category_id: expenseCategoryForm.category_id.trim(),
              name: expenseCategoryForm.name.trim(),
              note: expenseCategoryForm.note.trim(),
            }),
          },
          "経費区分の登録に失敗しました"
        )
        setExpenseCategoryForm(initialExpenseCategoryForm)
        toast.success("経費区分を登録しました。")
        await loadExpenseCategories()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "経費区分の登録に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [expenseCategoryForm, loadExpenseCategories]
  )

  // 経費区分更新を行う
  const handleUpdateExpenseCategory = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingExpenseCategory) return
      setBusyKey(`update-expense-category-${editingExpenseCategory.id}`)
      try {
        await requestJson<{ ok: true }>(
          `/api/master/expense-categories/${editingExpenseCategory.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category_id: editingExpenseCategory.category_id.trim(),
              name: editingExpenseCategory.name.trim(),
              note: (editingExpenseCategory.note ?? "").trim(),
            }),
          },
          "経費区分の更新に失敗しました"
        )
        setEditingExpenseCategory(null)
        toast.success("経費区分を更新しました。")
        await loadExpenseCategories()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "経費区分の更新に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [editingExpenseCategory, loadExpenseCategories]
  )

  // 経費区分削除を行う
  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    setBusyKey(`delete-expense-category-${pendingDelete.id}`)
    try {
      await requestJson<{ ok: true }>(
        pendingDelete.path,
        { method: "DELETE" },
        "経費区分の削除に失敗しました"
      )
      setPendingDelete(null)
      toast.success("経費区分を削除しました。")
      await loadExpenseCategories()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "経費区分の削除に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }, [pendingDelete, loadExpenseCategories])

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                  onChange={(e) =>
                    setExpenseCategoryForm((c) => ({ ...c, category_id: e.target.value }))
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
                  onChange={(e) =>
                    setExpenseCategoryForm((c) => ({ ...c, name: e.target.value }))
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
                  onChange={(e) =>
                    setExpenseCategoryForm((c) => ({ ...c, note: e.target.value }))
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
                {busyKey === "create-expense-category" ? "登録中..." : "経費区分を登録"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>経費区分一覧</CardTitle>
            <CardDescription>
              {isLoading
                ? "最新データを表示します。"
                : `${expenseCategories.length}件を表示しています。`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={4} rows={4} />
            ) : expenseCategories.length === 0 ? (
              <EmptyState
                icon={Database}
                description="上のフォームから最初の経費区分を登録してください"
              />
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
                              setPendingDelete({
                                id: expenseCategory.id,
                                label: `経費区分「${expenseCategory.name}」`,
                                path: `/api/master/expense-categories/${expenseCategory.id}`,
                              })
                            }
                          >
                            {busyKey === `delete-expense-category-${expenseCategory.id}`
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
        open={editingExpenseCategory !== null}
        onOpenChange={(open) => { if (!open) setEditingExpenseCategory(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費区分を編集</DialogTitle>
            <DialogDescription>区分コード、名称、備考を更新できます。</DialogDescription>
          </DialogHeader>
          {editingExpenseCategory ? (
            <form className="space-y-4" onSubmit={handleUpdateExpenseCategory}>
              <div className="space-y-2">
                <Label htmlFor="edit-expense-category-id">区分コード</Label>
                <Input
                  id="edit-expense-category-id"
                  value={editingExpenseCategory.category_id}
                  onChange={(e) =>
                    setEditingExpenseCategory((c) => c ? { ...c, category_id: e.target.value } : c)
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
                  onChange={(e) =>
                    setEditingExpenseCategory((c) => c ? { ...c, name: e.target.value } : c)
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
                  onChange={(e) =>
                    setEditingExpenseCategory((c) => c ? { ...c, note: e.target.value } : c)
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
                  {busyKey?.startsWith("update-expense-category-") ? "更新中..." : "更新する"}
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
