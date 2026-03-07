"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/status-badge"
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

type ApiError = {
  error?: string
}

type ExpenseCategory = {
  id: string
  category_id: string
  name: string
  is_active: boolean
  note: string | null
}

type Expense = {
  id: string
  expense_id: string
  expense_date: string
  category_id: string
  category_name: string
  amount: number
  vendor: string | null
  description: string | null
  receipt_url: string | null
  status: string
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  reject_reason: string | null
  rework_reason: string | null
}

type ExpenseForm = {
  expense_date: string
  category_id: string
  amount: string
  vendor: string
  description: string
}

type CreateExpenseResponse = {
  id: string
  expense_id: string
}

type ReceiptResponse = {
  url: string | null
}

type ReceiptPreview = {
  expenseId: string
  expenseCode: string
  url: string
}

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

function createInitialExpenseForm(): ExpenseForm {
  return {
    expense_date: new Date().toISOString().slice(0, 10),
    category_id: "",
    amount: "",
    vendor: "",
    description: "",
  }
}

// API 応答からエラー文言を安全に取り出す
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

// 空欄入力を送信用に整える
function normalizeOptionalValue(value: string) {
  return value.trim()
}

// レシートの拡張子から PDF かどうかを判定する
function isPdfReceipt(receiptPath: string | null) {
  if (!receiptPath) return false
  return /\.pdf$/i.test(receiptPath)
}

// 日付を画面表示向けに整える
function formatDate(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString("ja-JP")
}

// 日時を画面表示向けに整える
function formatDateTime(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString("ja-JP")
}

// 金額を画面表示向けに整える
function formatCurrency(value: number | null) {
  if (value == null) return "-"

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}

// 経費ステータスを日本語表示に変換する
function getExpenseStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "REJECTED") return "却下"
  if (status === "REWORK_REQUIRED") return "差し戻し"
  if (status === "PAID") return "支払済み"
  return "申請中"
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

export default function ExpensePage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState<ExpenseForm>(createInitialExpenseForm)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [pageError, setPageError] = useState("")
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreview | null>(null)
  const receiptInputRef = useRef<HTMLInputElement | null>(null)

  const selectedCategory = useMemo(() => {
    return categories.find((category) => category.category_id === form.category_id) ?? null
  }, [categories, form.category_id])

  const isMutating = busyKey !== null

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

  // 経費区分一覧を取得する
  const loadCategories = useCallback(async () => {
    const data = await requestJson<ExpenseCategory[]>(
      "/api/master/expense-categories",
      undefined,
      "経費区分の取得に失敗しました"
    )
    setCategories(data)
  }, [])

  // ログイン中ユーザーの経費申請一覧を取得する
  const loadExpenses = useCallback(async () => {
    const data = await requestJson<Expense[]>(
      "/api/expense",
      undefined,
      "経費申請一覧の取得に失敗しました"
    )
    setExpenses(data)
  }, [])

  // レシートファイルをアップロードする
  const uploadReceipt = useCallback(async (expenseId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    await requestJson(
      `/api/expense/${expenseId}/receipt`,
      {
        method: "POST",
        body: formData,
      },
      "レシートのアップロードに失敗しました"
    )
  }, [])

  useEffect(() => {
    async function initialize() {
      setIsLoading(true)
      setPageError("")

      try {
        await Promise.all([loadCategories(), loadExpenses()])
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "画面の読み込みに失敗しました"
        setPageError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [loadCategories, loadExpenses])

  // 経費申請を送信して一覧を更新する
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!selectedCategory) {
        setPageError("区分を選択してください")
        return
      }

      const amount = Number(form.amount)
      if (!form.amount.trim() || Number.isNaN(amount)) {
        setPageError("金額を入力してください")
        return
      }

      if (amount < 0) {
        setPageError("金額は 0 以上で入力してください")
        return
      }

      setBusyKey("submit-expense")
      setPageError("")
      setSubmitMessage("")

      try {
        const result = await requestJson<CreateExpenseResponse>(
          "/api/expense",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              expense_date: form.expense_date,
              category_id: selectedCategory.category_id,
              category_name: selectedCategory.name,
              amount,
              vendor: normalizeOptionalValue(form.vendor),
              description: normalizeOptionalValue(form.description),
            }),
          },
          "経費申請に失敗しました"
        )

        if (receiptFile) {
          await uploadReceipt(result.id, receiptFile)
        }

        setForm(createInitialExpenseForm())
        setReceiptFile(null)
        if (receiptInputRef.current) {
          receiptInputRef.current.value = ""
        }
        await loadExpenses()
        setSubmitMessage(
          receiptFile
            ? `経費 ${result.expense_id} を申請し、レシートを添付しました。`
            : `経費 ${result.expense_id} を申請しました。`
        )
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "経費申請に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [form, loadExpenses, receiptFile, selectedCategory, uploadReceipt]
  )

  // レシートの署名付き URL を取得して新しいタブで開く
  const handleOpenReceipt = useCallback(async (expense: Expense) => {
    setBusyKey(`open-receipt:${expense.id}`)
    setPageError("")

    try {
      const data = await requestJson<ReceiptResponse>(
        `/api/expense/${expense.id}/receipt`,
        undefined,
        "レシートの取得に失敗しました"
      )

      if (!data.url) {
        setPageError(`経費 ${expense.expense_id} にはレシートが添付されていません`)
        return
      }

      if (isPdfReceipt(expense.receipt_url)) {
        window.open(data.url, "_blank", "noopener,noreferrer")
        return
      }

      setReceiptPreview({
        expenseId: expense.id,
        expenseCode: expense.expense_id,
        url: data.url,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "レシートの取得に失敗しました"
      setPageError(message)
    } finally {
      setBusyKey(null)
    }
  }, [])

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">経費申請</h1>
          <p className="text-sm text-muted-foreground">
            経費を申請し、自分の申請状況を確認する画面です。
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>新規申請</CardTitle>
              <CardDescription>
                経費日、区分、金額は必須です。支払先、内容、レシートは任意で入力できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">経費日</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={form.expense_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        expense_date: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>区分</Label>
                  <Select
                    value={form.category_id || undefined}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        category_id: value,
                      }))
                    }
                    disabled={isLoading || isMutating || categories.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          categories.length === 0
                            ? "利用できる経費区分がありません"
                            : "区分を選択"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.category_id}>
                          {category.name} ({category.category_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-amount">金額</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    placeholder="例: 1200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-vendor">支払先</Label>
                  <Input
                    id="expense-vendor"
                    value={form.vendor}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        vendor: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    placeholder="任意"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-description">内容</Label>
                  <textarea
                    id="expense-description"
                    className={TEXTAREA_CLASS}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    placeholder="任意"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-receipt">レシート添付</Label>
                  <Input
                    id="expense-receipt"
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) =>
                      setReceiptFile(event.target.files?.[0] ?? null)
                    }
                    disabled={isLoading || isMutating}
                  />
                  <p className="text-xs text-muted-foreground">
                    画像または PDF を 1 件添付できます。経費登録後に自動でアップロードします。
                  </p>
                  {receiptFile ? (
                    <p className="text-xs text-foreground">
                      選択中: {receiptFile.name}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || isMutating || categories.length === 0 || !selectedCategory}
                >
                  {busyKey === "submit-expense" ? "申請中..." : "経費を申請"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>自分の申請一覧</CardTitle>
                <CardDescription>
                  {isLoading ? "読み込み中です..." : `最新 ${expenses.length} 件を表示しています。`}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadExpenses()}
                disabled={isLoading || isMutating}
              >
                再読み込み
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-sm text-muted-foreground">
                  経費申請データを読み込み中です...
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground">
                  まだ経費申請はありません。
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>経費日</TableHead>
                        <TableHead>申請ID</TableHead>
                        <TableHead>区分</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                        <TableHead>支払先</TableHead>
                        <TableHead>内容</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>添付状況</TableHead>
                        <TableHead>レシート</TableHead>
                        <TableHead>詳細</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{formatDate(expense.expense_date)}</TableCell>
                          <TableCell>{expense.expense_id}</TableCell>
                          <TableCell>{expense.category_name}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="max-w-48 whitespace-normal">
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
                          <TableCell>
                            <Badge
                              variant={expense.receipt_url ? "default" : "outline"}
                            >
                              {expense.receipt_url ? "添付済み" : "未添付"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleOpenReceipt(expense)}
                              disabled={isMutating || !expense.receipt_url}
                            >
                              {busyKey === `open-receipt:${expense.id}`
                                ? "取得中..."
                                : expense.receipt_url
                                  ? "レシート"
                                  : "未添付"}
                            </Button>
                          </TableCell>
                          <TableCell className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                            <div>申請: {formatDateTime(expense.submitted_at)}</div>
                            {expense.approved_at ? (
                              <div>承認: {formatDateTime(expense.approved_at)}</div>
                            ) : null}
                            {expense.reject_reason ? <div>却下理由: {expense.reject_reason}</div> : null}
                            {expense.rework_reason ? (
                              <div>差し戻し理由: {expense.rework_reason}</div>
                            ) : null}
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
      </div>

      <Dialog
        open={receiptPreview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReceiptPreview(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>レシート画像プレビュー</DialogTitle>
            <DialogDescription>
              {receiptPreview
                ? `経費 ${receiptPreview.expenseCode} に添付された画像を表示しています。`
                : "レシート画像を表示します。"}
            </DialogDescription>
          </DialogHeader>

          {receiptPreview ? (
            <div className="overflow-auto rounded-md border bg-muted/20 p-2">
              <img
                src={receiptPreview.url}
                alt={`経費 ${receiptPreview.expenseCode} のレシート`}
                className="mx-auto max-h-[65vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>
          ) : null}

          <DialogFooter>
            {receiptPreview ? (
              <Button asChild variant="outline">
                <a
                  href={receiptPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  新しいタブで開く
                </a>
              </Button>
            ) : null}
            <Button type="button" onClick={() => setReceiptPreview(null)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
