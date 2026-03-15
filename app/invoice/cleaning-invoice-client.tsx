"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Printer, Receipt } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, getErrorMessage } from "@/lib/format"

type Customer = { id: string; cust_id: string; name: string }

type InvoiceSummary = {
  invoice_id: string; store_id: string; store_name: string
  invoice_period_from: string; invoice_period_to: string
  invoiced_at: string; count: number; total_amount: number
}

type PreviewItem = {
  id: string; job_id: string; work_date: string; work_name: string | null
  car_type_text: string | null; qty: number; unit_price: number; amount: number
}

type DetailItem = {
  job_id: string; work_date: string; work_code: string | null; work_name: string | null
  car_type_text: string | null; id_list_raw: string | null
  qty: number; unit_price: number; amount: number; emp_id: string | null
  store_name: string | null; store_id: string | null
  invoice_period_from: string | null; invoice_period_to: string | null; invoiced_at: string | null
}

// 作業種別ごとの集計
type WorkSummary = { work_name: string; qty: number; unit_price: number; amount: number }

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init })
  const data = await res.json()
  if (!res.ok) throw new Error(getErrorMessage(data, "通信エラー"))
  return data as T
}

function fmtDate(v: string) { return v ? v.replaceAll("-", "/") : "-" }

function getLastMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last = new Date(now.getFullYear(), now.getMonth(), 0)
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) }
}

// 請求書の印刷用コンポーネント
function InvoicePrintView({ details, invoiceId }: { details: DetailItem[]; invoiceId: string }) {
  const printRef = useRef<HTMLDivElement>(null)

  if (details.length === 0) return null

  const storeName = details[0].store_name ?? ""
  const periodFrom = details[0].invoice_period_from ?? ""
  const periodTo = details[0].invoice_period_to ?? ""
  const invoicedAt = details[0].invoiced_at ? new Date(details[0].invoiced_at).toLocaleDateString("ja-JP") : ""

  // 作業種別サマリ集計
  const workSummaryMap = new Map<string, WorkSummary>()
  for (const d of details) {
    const key = d.work_name ?? "その他"
    const existing = workSummaryMap.get(key)
    if (existing) {
      existing.qty += d.qty
      existing.amount += Number(d.amount)
    } else {
      workSummaryMap.set(key, { work_name: key, qty: d.qty, unit_price: Number(d.unit_price), amount: Number(d.amount) })
    }
  }
  const workSummaries = Array.from(workSummaryMap.values())
  const subtotal = workSummaries.reduce((s, w) => s + w.amount, 0)
  const tax = Math.floor(subtotal * 0.1)
  const total = subtotal + tax

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const w = window.open("", "_blank")
    if (!w) { toast.error("ポップアップがブロックされました"); return }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>請求書 ${invoiceId}</title>
<style>
  @media print { @page { margin: 15mm; size: A4; } }
  body { font-family: "Hiragino Sans", "Yu Gothic", sans-serif; color: #1a1a1a; margin: 0; padding: 20px; }
  .header { background: #1e3a5f; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 24px; margin: 0; letter-spacing: 4px; }
  .header .meta { text-align: right; font-size: 12px; }
  .billing-to { background: #f5f5f5; padding: 12px 16px; margin: 16px 0; font-size: 14px; }
  .billing-to .name { font-size: 18px; font-weight: bold; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; display: inline-block; }
  .period { font-size: 13px; color: #555; margin: 8px 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
  th { background: #1e3a5f; color: white; padding: 8px; text-align: left; font-weight: normal; }
  th.right, td.right { text-align: right; }
  td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
  .total-section { margin-top: 16px; text-align: right; }
  .total-section .row { display: flex; justify-content: flex-end; gap: 24px; padding: 4px 0; font-size: 14px; }
  .total-section .grand { font-size: 20px; font-weight: bold; border-top: 2px solid #1e3a5f; padding-top: 8px; margin-top: 8px; }
  .detail-title { font-size: 14px; font-weight: bold; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
  .detail-table td { font-size: 11px; }
  .page-break { page-break-before: always; }
</style></head><body>${content.innerHTML}</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="mr-1 size-4" />印刷 / PDF
        </Button>
      </div>

      <div ref={printRef}>
        {/* 表紙：作業種別集計 */}
        <div className="header">
          <h1>請求書</h1>
          <div className="meta">
            <div>請求書番号: {invoiceId}</div>
            <div>発行日: {invoicedAt}</div>
          </div>
        </div>

        <div className="billing-to">
          <div className="name">{storeName} 御中</div>
        </div>

        <div className="period">対象期間: {fmtDate(periodFrom)} 〜 {fmtDate(periodTo)}</div>

        <table>
          <thead>
            <tr>
              <th>作業種別</th>
              <th className="right">数量</th>
              <th className="right">単価</th>
              <th className="right">金額</th>
            </tr>
          </thead>
          <tbody>
            {workSummaries.map((w) => (
              <tr key={w.work_name}>
                <td>{w.work_name}</td>
                <td className="right">{w.qty}</td>
                <td className="right">{formatCurrency(w.unit_price)}</td>
                <td className="right">{formatCurrency(w.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="total-section">
          <div className="row"><span>小計</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="row"><span>消費税 (10%)</span><span>{formatCurrency(tax)}</span></div>
          <div className="row grand"><span>合計</span><span>{formatCurrency(total)}</span></div>
        </div>

        {/* 明細：車両ID別 */}
        <div className="page-break"></div>
        <div className="detail-title">明細一覧（{details.length}件）</div>
        <table className="detail-table">
          <thead>
            <tr>
              <th>作業日</th>
              <th>作業種別</th>
              <th>車種</th>
              <th>車両管理番号</th>
              <th className="right">数量</th>
              <th className="right">単価</th>
              <th className="right">金額</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d) => (
              <tr key={d.job_id}>
                <td>{fmtDate(d.work_date)}</td>
                <td>{d.work_name ?? "-"}</td>
                <td>{d.car_type_text ?? "-"}</td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 200 }}>{d.id_list_raw ?? "-"}</td>
                <td className="right">{d.qty}</td>
                <td className="right">{formatCurrency(Number(d.unit_price))}</td>
                <td className="right">{formatCurrency(Number(d.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// メインコンポーネント
export default function CleaningInvoiceClient() {
  const lastMonth = getLastMonthRange()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [selectedStore, setSelectedStore] = useState("")
  const [periodFrom, setPeriodFrom] = useState(lastMonth.from)
  const [periodTo, setPeriodTo] = useState(lastMonth.to)
  const [previewResult, setPreviewResult] = useState<{ count: number; total_amount: number; items: PreviewItem[] } | null>(null)
  const [detailInvoice, setDetailInvoice] = useState<InvoiceSummary | null>(null)
  const [details, setDetails] = useState<DetailItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const selectedCustomer = useMemo(() => customers.find(c => c.cust_id === selectedStore), [customers, selectedStore])

  const loadPageData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [custs, invs] = await Promise.all([
        fetchJson<Customer[]>("/api/master/customers"),
        fetchJson<InvoiceSummary[]>("/api/cleaning-job-invoice"),
      ])
      setCustomers(custs)
      setInvoices(invs)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "読み込みに失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadPageData() }, [loadPageData])

  const handlePreview = useCallback(async () => {
    if (!selectedStore || !periodFrom || !periodTo) { toast.error("店舗と期間を入力してください"); return }
    setIsPreviewLoading(true)
    try {
      const data = await fetchJson<{ count: number; total_amount: number; items: PreviewItem[] }>("/api/cleaning-job-invoice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: selectedStore, period_from: periodFrom, period_to: periodTo, preview: true }),
      })
      setPreviewResult(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "プレビューに失敗しました")
    } finally {
      setIsPreviewLoading(false)
    }
  }, [selectedStore, periodFrom, periodTo])

  const handleIssue = useCallback(async () => {
    if (!selectedStore || !periodFrom || !periodTo) return
    setIsIssuing(true)
    try {
      const data = await fetchJson<{ invoice_id: string; count: number; totalAmount: number }>("/api/cleaning-job-invoice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: selectedStore, period_from: periodFrom, period_to: periodTo }),
      })
      setPreviewResult(null)
      await loadPageData()
      toast.success(`請求書 ${data.invoice_id} を発行しました（${data.count}件 / ${formatCurrency(data.totalAmount)}）`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "発行に失敗しました")
    } finally {
      setIsIssuing(false)
    }
  }, [selectedStore, periodFrom, periodTo, loadPageData])

  const openDetail = useCallback(async (inv: InvoiceSummary) => {
    setDetailInvoice(inv)
    setDetails([])
    setIsDetailLoading(true)
    try {
      const data = await fetchJson<DetailItem[]>(`/api/cleaning-job-invoice/${inv.invoice_id}`)
      setDetails(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "明細取得に失敗しました")
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  const subtotal = previewResult ? previewResult.total_amount : 0
  const tax = Math.floor(subtotal * 0.1)

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">請求書管理</h1>
          <p className="text-sm text-muted-foreground">店舗と請求期間を指定して請求書を発行できます。</p>
        </div>

        {/* 発行フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>発行フォーム</CardTitle>
            <CardDescription>承認済み・未請求の作業実績を対象にプレビューし、請求書を発行します。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label>店舗</Label>
                <Select value={selectedStore || undefined} onValueChange={setSelectedStore} disabled={isLoading || customers.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={customers.length === 0 ? "先に店舗を登録してください" : "店舗を選択"} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.cust_id}>{c.name} ({c.cust_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>期間 From</Label>
                <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label>期間 To</Label>
                <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} disabled={isLoading} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => void handlePreview()} disabled={isPreviewLoading || isIssuing || !selectedStore}>
                {isPreviewLoading ? "プレビュー中..." : "プレビュー"}
              </Button>
              <Button onClick={() => void handleIssue()} disabled={isIssuing || !previewResult || previewResult.count === 0}>
                {isIssuing ? "発行中..." : "発行"}
              </Button>
            </div>

            {previewResult && (
              <div className="rounded-lg border bg-background px-4 py-4 space-y-3">
                <div className="text-sm font-medium">プレビュー結果</div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">店舗</div><div className="text-sm">{selectedCustomer?.name ?? "-"}</div></div>
                  <div><div className="text-xs text-muted-foreground">対象件数</div><div className="text-sm">{previewResult.count} 件</div></div>
                  <div><div className="text-xs text-muted-foreground">小計</div><div className="text-sm">{formatCurrency(subtotal)}</div></div>
                  <div><div className="text-xs text-muted-foreground">税込合計</div><div className="text-sm font-medium">{formatCurrency(subtotal + tax)}</div></div>
                </div>

                {previewResult.count === 0 ? (
                  <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">対象の実績がありません</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>作業日</TableHead>
                          <TableHead>作業種別</TableHead>
                          <TableHead>車種</TableHead>
                          <TableHead className="text-right">数量</TableHead>
                          <TableHead className="text-right">単価</TableHead>
                          <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewResult.items.map((item) => (
                          <TableRow key={item.job_id}>
                            <TableCell>{fmtDate(item.work_date)}</TableCell>
                            <TableCell>{item.work_name ?? "-"}</TableCell>
                            <TableCell>{item.car_type_text ?? "-"}</TableCell>
                            <TableCell className="text-right">{item.qty}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(item.amount))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 発行済み一覧 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>発行済み請求書</CardTitle>
                <CardDescription>{isLoading ? "読み込み中..." : `${invoices.length}件`}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadPageData()} disabled={isLoading}>再読み込み</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton columns={7} rows={4} /> : invoices.length === 0 ? (
              <EmptyState icon={Receipt} description="まだ請求書がありません" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>請求書番号</TableHead>
                      <TableHead>店舗</TableHead>
                      <TableHead>対象期間</TableHead>
                      <TableHead className="text-right">件数</TableHead>
                      <TableHead className="text-right">小計</TableHead>
                      <TableHead className="text-right">税込合計</TableHead>
                      <TableHead>発行日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.invoice_id} className="cursor-pointer" onClick={() => void openDetail(inv)}>
                        <TableCell className="font-medium">{inv.invoice_id}</TableCell>
                        <TableCell>{inv.store_name || inv.store_id}</TableCell>
                        <TableCell>{fmtDate(inv.invoice_period_from)} 〜 {fmtDate(inv.invoice_period_to)}</TableCell>
                        <TableCell className="text-right">{inv.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.total_amount + Math.floor(inv.total_amount * 0.1))}</TableCell>
                        <TableCell>{inv.invoiced_at ? new Date(inv.invoiced_at).toLocaleDateString("ja-JP") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 明細モーダル（印刷対応） */}
      <Dialog open={detailInvoice !== null} onOpenChange={(open) => { if (!open) { setDetailInvoice(null); setDetails([]) } }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>請求書 {detailInvoice?.invoice_id}</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? <TableSkeleton columns={7} rows={4} /> : (
            <InvoicePrintView details={details} invoiceId={detailInvoice?.invoice_id ?? ""} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
