"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Receipt } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
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

type Customer = {
  id: string
  cust_id: string
  name: string
}

type InvoiceSummary = {
  invoice_id: string
  cust_id: string
  invoice_period_from: string
  invoice_period_to: string
  invoiced_at: string
  count: number
  total_amount: number
}

type InvoicePreviewResponse = {
  count: number
  total_amount: number
}

type InvoiceIssueResponse = {
  invoice_id: string
  count: number
  totalAmount: number
}

type InvoiceDetail = {
  billable_id: string
  run_date: string
  emp_id: string | null
  route_id: string | null
  pickup_loc: string | null
  drop_loc: string | null
  amount: number | null
  vehicle_id: string | null
  distance_km: number | null
  note: string | null
}

class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
  }
}

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
    throw new ApiRequestError(getErrorMessage(data, fallbackMessage), response.status)
  }

  return data as T
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateLabel(value: string) {
  if (!value) return "-"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replaceAll("-", "/")
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ja-JP")
}

function formatDateTimeLabel(value: string) {
  if (!value) return "-"

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ja-JP")
}

function formatPeriodLabel(from: string, to: string) {
  return `${formatDateLabel(from)} - ${formatDateLabel(to)}`
}

export default function InvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [selectedCustomerCode, setSelectedCustomerCode] = useState("")
  const [periodFrom, setPeriodFrom] = useState("")
  const [periodTo, setPeriodTo] = useState("")
  const [previewResult, setPreviewResult] = useState<InvoicePreviewResponse | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetail[]>([])
  const [pageError, setPageError] = useState("")
  const [detailError, setDetailError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [hasNoPermission, setHasNoPermission] = useState(false)

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.cust_id === selectedCustomerCode) ?? null
  }, [customers, selectedCustomerCode])

  useEffect(() => {
    if (pageError) {
      toast.error(pageError)
    }
  }, [pageError])

  useEffect(() => {
    if (detailError) {
      toast.error(detailError)
    }
  }, [detailError])

  useEffect(() => {
    if (hasNoPermission) {
      toast.error("権限がありません")
    }
  }, [hasNoPermission])

  // 請求書の発行条件を確認して API 送信用データを組み立てる
  const buildRequestBody = useCallback(() => {
    if (!selectedCustomerCode || !periodFrom || !periodTo) {
      throw new Error("荷主と請求期間（from/to）を入力してください")
    }

    if (periodFrom > periodTo) {
      throw new Error("請求期間は From を To 以前にしてください")
    }

    return {
      cust_id: selectedCustomerCode,
      period_from: periodFrom,
      period_to: periodTo,
    }
  }, [periodFrom, periodTo, selectedCustomerCode])

  // 画面表示に必要な荷主一覧と請求書一覧をまとめて取得する
  const loadPageData = useCallback(async () => {
    setIsLoading(true)
    setPageError("")

    try {
      const [customerData, invoiceData] = await Promise.all([
        requestJson<Customer[]>(
          "/api/master/customers",
          undefined,
          "荷主一覧の取得に失敗しました"
        ),
        requestJson<InvoiceSummary[]>("/api/invoice", undefined, "請求書一覧の取得に失敗しました"),
      ])

      setCustomers(customerData)
      setInvoices(invoiceData)
      setHasNoPermission(false)
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setHasNoPermission(true)
        setPageError("")
        return
      }

      const message =
        error instanceof Error ? error.message : "請求書画面の初期化に失敗しました"
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPageData()
  }, [loadPageData])

  const handlePreview = useCallback(async () => {
    setIsPreviewLoading(true)
    setPageError("")

    try {
      const body = buildRequestBody()
      const data = await requestJson<InvoicePreviewResponse>(
        "/api/invoice",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...body,
            preview: true,
          }),
        },
        "請求対象のプレビュー取得に失敗しました"
      )

      setPreviewResult(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "請求対象のプレビュー取得に失敗しました"
      setPageError(message)
      setPreviewResult(null)
    } finally {
      setIsPreviewLoading(false)
    }
  }, [buildRequestBody])

  const handleIssue = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setIsIssuing(true)
      setPageError("")

      try {
        const body = buildRequestBody()
        const data = await requestJson<InvoiceIssueResponse>(
          "/api/invoice",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
          "請求書の発行に失敗しました"
        )

        setPreviewResult(null)
        await loadPageData()
        toast.success("請求書を発行しました", {
          description: `${data.invoice_id} / ${data.count}件 / ${formatCurrency(data.totalAmount)}`,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "請求書の発行に失敗しました"
        setPageError(message)
      } finally {
        setIsIssuing(false)
      }
    },
    [buildRequestBody, loadPageData]
  )

  // 請求書ごとの運行実績明細を取得してモーダル表示する
  const openInvoiceDetail = useCallback(async (invoice: InvoiceSummary) => {
    setSelectedInvoice(invoice)
    setInvoiceDetails([])
    setDetailError("")
    setIsDetailLoading(true)

    try {
      const detailData = await requestJson<InvoiceDetail[]>(
        `/api/invoice/${invoice.invoice_id}`,
        undefined,
        "請求書明細の取得に失敗しました"
      )

      setInvoiceDetails(detailData)
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setHasNoPermission(true)
        setSelectedInvoice(null)
        return
      }

      const message =
        error instanceof Error ? error.message : "請求書明細の取得に失敗しました"
      setDetailError(message)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  if (hasNoPermission) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">請求書管理</h1>
            <p className="text-sm text-muted-foreground">
              荷主と請求期間を指定して請求書を発行し、発行済み一覧と明細を確認できます。
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
          <h1 className="text-3xl font-semibold tracking-tight">請求書管理</h1>
          <p className="text-sm text-muted-foreground">
            荷主と請求期間を指定してプレビューし、そのまま請求書を発行できます。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>発行フォーム</CardTitle>
            <CardDescription>
              承認済みかつ未請求の運行実績を対象に、請求対象件数と合計金額を確認してから発行します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleIssue}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 xl:col-span-2">
                  <Label>荷主</Label>
                  <Select
                    value={selectedCustomerCode || undefined}
                    onValueChange={setSelectedCustomerCode}
                    disabled={isLoading || isPreviewLoading || isIssuing || customers.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          customers.length === 0 ? "先に荷主を登録してください" : "荷主を選択"
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
                  <Label htmlFor="period-from">請求期間 From</Label>
                  <Input
                    id="period-from"
                    type="date"
                    value={periodFrom}
                    onChange={(event) => setPeriodFrom(event.target.value)}
                    disabled={isLoading || isPreviewLoading || isIssuing}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period-to">請求期間 To</Label>
                  <Input
                    id="period-to"
                    type="date"
                    value={periodTo}
                    onChange={(event) => setPeriodTo(event.target.value)}
                    disabled={isLoading || isPreviewLoading || isIssuing}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handlePreview()}
                  disabled={isLoading || isPreviewLoading || isIssuing || customers.length === 0}
                >
                  {isPreviewLoading ? "プレビュー中..." : "プレビュー"}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || isPreviewLoading || isIssuing || customers.length === 0}
                >
                  {isIssuing ? "発行中..." : "発行"}
                </Button>
              </div>

              {previewResult ? (
                <div className="rounded-lg border bg-background px-4 py-4">
                  <div className="text-sm font-medium">プレビュー結果</div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">荷主</div>
                      <div className="text-sm">
                        {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.cust_id})` : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">対象件数</div>
                      <div className="text-sm">{previewResult.count} 件</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">合計金額</div>
                      <div className="text-sm">{formatCurrency(previewResult.total_amount)}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>請求書一覧</CardTitle>
              <CardDescription>
                {isLoading ? "最新データを表示します。" : `${invoices.length}件の請求書を表示しています。`}
              </CardDescription>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => void loadPageData()} disabled={isLoading}>
                {isLoading ? "更新中..." : "再読み込み"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={7} rows={4} />
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                description="上のフォームから最初の請求書を登録してください"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>請求書番号</TableHead>
                      <TableHead>荷主コード</TableHead>
                      <TableHead>対象期間</TableHead>
                      <TableHead className="text-right">件数</TableHead>
                      <TableHead className="text-right">合計金額</TableHead>
                      <TableHead>発行日</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.invoice_id}
                        className="cursor-pointer"
                        onClick={() => void openInvoiceDetail(invoice)}
                      >
                        <TableCell className="font-medium">{invoice.invoice_id}</TableCell>
                        <TableCell>{invoice.cust_id || "-"}</TableCell>
                        <TableCell>
                          {formatPeriodLabel(invoice.invoice_period_from, invoice.invoice_period_to)}
                        </TableCell>
                        <TableCell className="text-right">{invoice.count}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.total_amount)}
                        </TableCell>
                        <TableCell>{formatDateTimeLabel(invoice.invoiced_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              void openInvoiceDetail(invoice)
                            }}
                          >
                            明細
                          </Button>
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

      <Dialog
        open={selectedInvoice !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvoice(null)
            setInvoiceDetails([])
            setDetailError("")
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>請求書明細</DialogTitle>
            <DialogDescription>
              {selectedInvoice
                ? `${selectedInvoice.invoice_id} / ${selectedInvoice.cust_id} / ${formatPeriodLabel(
                    selectedInvoice.invoice_period_from,
                    selectedInvoice.invoice_period_to
                  )}`
                : "請求書に含まれる運行実績を表示します。"}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <TableSkeleton columns={10} rows={4} />
          ) : invoiceDetails.length === 0 ? (
            <EmptyState
              icon={Receipt}
              description="上のフォームから最初の請求書を登録してください"
            />
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>実績ID</TableHead>
                    <TableHead>運行日</TableHead>
                    <TableHead>社員ID</TableHead>
                    <TableHead>ルート</TableHead>
                    <TableHead>積み地</TableHead>
                    <TableHead>降ろし地</TableHead>
                    <TableHead>車両</TableHead>
                    <TableHead className="text-right">距離</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>備考</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceDetails.map((detail) => (
                    <TableRow key={detail.billable_id}>
                      <TableCell>{detail.billable_id}</TableCell>
                      <TableCell>{formatDateLabel(detail.run_date)}</TableCell>
                      <TableCell>{detail.emp_id || "-"}</TableCell>
                      <TableCell>{detail.route_id || "-"}</TableCell>
                      <TableCell>{detail.pickup_loc || "-"}</TableCell>
                      <TableCell>{detail.drop_loc || "-"}</TableCell>
                      <TableCell>{detail.vehicle_id || "-"}</TableCell>
                      <TableCell className="text-right">
                        {detail.distance_km === null ? "-" : `${detail.distance_km} km`}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(detail.amount ?? 0))}
                      </TableCell>
                      <TableCell className="max-w-72 whitespace-normal">{detail.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
