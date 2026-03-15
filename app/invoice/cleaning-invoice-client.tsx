"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Printer, Receipt, Trash2 } from "lucide-react"
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

type IssuerInfo = {
  issuer_name?: string; issuer_address?: string; issuer_tel?: string
  tax_id?: string; bank_info?: string
}

type WorkSummary = { work_name: string; qty: number; amount: number }

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init })
  const data = await res.json()
  if (!res.ok) throw new Error(getErrorMessage(data, "通信エラー"))
  return data as T
}

function fmtDate(v: string) { return v ? v.replaceAll("-", "/") : "-" }
function fmtCur(v: number) { return `¥${Math.floor(v).toLocaleString()}` }

function getLastMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last = new Date(now.getFullYear(), now.getMonth(), 0)
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) }
}

// 支払期限: 翌月末
function calcPaymentDue(invoicedAt: string): string {
  const d = new Date(invoicedAt)
  const due = new Date(d.getFullYear(), d.getMonth() + 2, 0)
  return due.toLocaleDateString("ja-JP")
}

// 保存期限: 7年後
function calcRetentionUntil(invoicedAt: string): string {
  const d = new Date(invoicedAt)
  d.setFullYear(d.getFullYear() + 7)
  return d.toLocaleDateString("ja-JP")
}

// 印刷用 請求書ビュー（旧システム準拠）
function InvoicePrintView({ details, invoiceId, issuer }: {
  details: DetailItem[]; invoiceId: string; issuer: IssuerInfo
}) {
  const printRef = useRef<HTMLDivElement>(null)
  if (details.length === 0) return null

  const storeName = details[0].store_name ?? ""
  const periodFrom = details[0].invoice_period_from ?? ""
  const periodTo = details[0].invoice_period_to ?? ""
  const invoicedAt = details[0].invoiced_at ?? ""
  const invoicedAtStr = invoicedAt ? new Date(invoicedAt).toLocaleDateString("ja-JP") : ""

  // 作業種別サマリ集計
  const workMap = new Map<string, WorkSummary>()
  for (const d of details) {
    const key = d.work_name ?? "その他"
    const ex = workMap.get(key)
    if (ex) { ex.qty += d.qty; ex.amount += Number(d.amount) }
    else workMap.set(key, { work_name: key, qty: d.qty, amount: Number(d.amount) })
  }
  const workSummaries = Array.from(workMap.values())
  const subtotal = workSummaries.reduce((s, w) => s + w.amount, 0)
  const tax = Math.floor(subtotal * 0.1)
  const total = subtotal + tax

  const printCSS = `
@media print { @page { margin: 15mm; size: A4; } }
body { font-family: "Hiragino Sans","Yu Gothic",sans-serif; color:#1a1a1a; margin:0; padding:24px; font-size:9pt; }
.title-bar { background:#1e3a5f; color:white; padding:12px 20px; text-align:center; font-size:20pt; font-weight:bold; letter-spacing:4px; }
.meta-row { display:flex; justify-content:space-between; margin:12px 0; font-size:9pt; }
.meta-row .left { }
.meta-row .right { text-align:right; }
.client-box { background:#f5f5f5; padding:10px 16px; margin:12px 0; }
.client-name { font-size:13pt; font-weight:bold; border-bottom:2px solid #1e3a5f; padding-bottom:4px; display:inline-block; }
.summary-box { border:1px solid #94a3b8; margin:16px 0; }
.summary-box .row { display:flex; border-bottom:1px solid #94a3b8; }
.summary-box .row:last-child { border-bottom:none; }
.summary-box .label { width:200px; padding:6px 12px; font-weight:bold; background:#f1f5f9; border-right:1px solid #94a3b8; }
.summary-box .value { flex:1; padding:6px 12px; }
.summary-box .value.large { font-size:18pt; font-weight:bold; }
.tax-table { width:100%; border-collapse:collapse; margin:16px 0; font-size:9pt; }
.tax-table th { background:#1e3a5f; color:white; padding:6px 8px; text-align:center; font-weight:normal; }
.tax-table td { padding:6px 8px; text-align:right; border:1px solid #94a3b8; }
.bank-section { margin:16px 0; }
.bank-section .heading { font-size:9pt; font-weight:bold; margin-bottom:4px; }
.bank-box { background:#f5f5f5; padding:8px 12px; font-size:9pt; border:1px solid #ddd; }
.notes { margin:16px 0; font-size:9pt; }
.notes .heading { font-weight:bold; margin-bottom:4px; }
.notes p { margin:2px 0; }
.page-break { page-break-before:always; }
.detail-header { background:#1e3a5f; color:white; padding:8px 16px; font-size:11pt; font-weight:bold; }
.detail-meta { background:#dbeafe; padding:6px 12px; font-size:9pt; margin-bottom:8px; }
.detail-meta .row { display:flex; gap:16px; padding:2px 0; }
.detail-meta .lbl { font-weight:bold; min-width:80px; }
table.detail { width:100%; border-collapse:collapse; font-size:9pt; }
table.detail th { background:#1e3a5f; color:white; padding:6px 8px; text-align:left; font-weight:normal; font-size:9pt; }
table.detail th.r { text-align:right; }
table.detail td { padding:4px 8px; border-bottom:1px solid #ddd; font-size:9pt; }
table.detail td.r { text-align:right; }
table.detail tr:nth-child(odd) td { background:#f1f5f9; }
.detail-total { text-align:right; font-size:9pt; font-weight:bold; margin-top:8px; padding:4px 8px; }
`

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const w = window.open("", "_blank")
    if (!w) { toast.error("ポップアップがブロックされました"); return }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>請求書 ${invoiceId}</title><style>${printCSS}</style></head><body>${content.innerHTML}</body></html>`)
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
        {/* === 表紙 === */}
        <div className="title-bar">請　求　書</div>

        <div className="meta-row">
          <div className="left"></div>
          <div className="right">
            <div>発行日: {invoicedAtStr}</div>
            <div>請求書番号: {invoiceId}</div>
            {issuer.tax_id && <div>登録番号: T{issuer.tax_id}</div>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="client-box" style={{ flex: 1 }}>
            <div className="client-name">{storeName}　御中</div>
            <div style={{ marginTop: 4, fontSize: "9pt" }}>下記の通り、ご請求申し上げます。</div>
          </div>
          {issuer.issuer_name && (
            <div style={{ textAlign: "right", fontSize: "9pt", marginLeft: 24 }}>
              <div style={{ fontWeight: "bold", fontSize: "10pt" }}>{issuer.issuer_name}</div>
              {issuer.issuer_address && <div>{issuer.issuer_address}</div>}
              {issuer.issuer_tel && <div>TEL: {issuer.issuer_tel}</div>}
            </div>
          )}
        </div>

        <div className="summary-box">
          <div className="row"><div className="label">請　求　期　間</div><div className="value">{fmtDate(periodFrom)} 〜 {fmtDate(periodTo)}</div></div>
          <div className="row"><div className="label">お　支　払　期　限</div><div className="value">{invoicedAt ? calcPaymentDue(invoicedAt) : "-"}</div></div>
          <div className="row"><div className="label">ご請求金額（税込）</div><div className="value large">{fmtCur(total)}</div></div>
        </div>

        <table className="tax-table">
          <thead><tr><th>区　分</th><th>税抜金額</th><th>消費税額（10%）</th><th>合計（税込）</th></tr></thead>
          <tbody><tr><td>10%対象</td><td>{fmtCur(subtotal)}</td><td>{fmtCur(tax)}</td><td>{fmtCur(total)}</td></tr></tbody>
        </table>

        {issuer.bank_info && (
          <div className="bank-section">
            <div className="heading">■ お振込先</div>
            <div className="bank-box">{issuer.bank_info}</div>
          </div>
        )}

        <div className="notes">
          <div className="heading">■ 備考</div>
          <p>※ 請求明細は別紙（{details.length} 件）に記載します。</p>
          <p>※ お振込手数料はご負担くださいますようお願い申し上げます。</p>
          {invoicedAt && <p>※ 本書類の保存期限: {calcRetentionUntil(invoicedAt)}</p>}
        </div>

        {/* === 明細ページ === */}
        <div className="page-break"></div>
        <div className="detail-header">請求明細（別紙）</div>
        <div className="detail-meta">
          <div className="row"><span className="lbl">請求書ID</span><span>{invoiceId}</span></div>
          <div className="row"><span className="lbl">請求期間</span><span>{fmtDate(periodFrom)} 〜 {fmtDate(periodTo)}</span></div>
          <div className="row"><span className="lbl">請求先</span><span>{storeName}</span></div>
          <div className="row"><span className="lbl">明細件数</span><span>{details.length}件　小計 {fmtCur(subtotal)}　税 {fmtCur(tax)}　税込合計 {fmtCur(total)}</span></div>
        </div>

        <table className="detail">
          <thead>
            <tr>
              <th>作業日</th>
              <th>作業種別</th>
              <th>車種</th>
              <th>車両管理番号</th>
              <th className="r">数量</th>
              <th className="r">単価</th>
              <th className="r">金額</th>
            </tr>
          </thead>
          <tbody>
            {details.map(d => (
              <tr key={d.job_id}>
                <td>{fmtDate(d.work_date)}</td>
                <td>{d.work_name ?? "-"}</td>
                <td>{d.car_type_text ?? "-"}</td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 200 }}>{d.id_list_raw ?? "-"}</td>
                <td className="r">{d.qty}</td>
                <td className="r">{fmtCur(Number(d.unit_price))}</td>
                <td className="r">{fmtCur(Number(d.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="detail-total">
          合計 {details.length}件　税抜 {fmtCur(subtotal)}　消費税（10%）{fmtCur(tax)}　税込合計 {fmtCur(total)}
        </div>
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
  const [issuer, setIssuer] = useState<IssuerInfo>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const selectedCustomer = useMemo(() => customers.find(c => c.cust_id === selectedStore), [customers, selectedStore])

  const loadPageData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [custs, invs, me] = await Promise.all([
        fetchJson<Customer[]>("/api/master/customers"),
        fetchJson<InvoiceSummary[]>("/api/cleaning-job-invoice"),
        fetchJson<{ custom_settings?: { invoice_issuer?: IssuerInfo } }>("/api/me"),
      ])
      setCustomers(custs)
      setInvoices(invs)
      setIssuer(me.custom_settings?.invoice_issuer ?? {})
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

  const handleDelete = useCallback(async (inv: InvoiceSummary) => {
    if (!confirm(`請求書 ${inv.invoice_id} を削除しますか？\n対象の作業実績は未請求状態に戻ります。`)) return
    setIsDeleting(true)
    try {
      await fetchJson(`/api/cleaning-job-invoice/${inv.invoice_id}`, { method: "DELETE" })
      toast.success(`請求書 ${inv.invoice_id} を削除しました`)
      setDetailInvoice(null)
      setDetails([])
      await loadPageData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました")
    } finally {
      setIsDeleting(false)
    }
  }, [loadPageData])

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
                        {previewResult.items.map(item => (
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
            {isLoading ? <TableSkeleton columns={8} rows={4} /> : invoices.length === 0 ? (
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
                      <TableHead className="text-right">操作</TableHead>
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
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" disabled={isDeleting} onClick={(e) => { e.stopPropagation(); void handleDelete(inv) }}>
                            <Trash2 className="size-4 text-destructive" />
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

      {/* 明細モーダル（印刷対応） */}
      <Dialog open={detailInvoice !== null} onOpenChange={open => { if (!open) { setDetailInvoice(null); setDetails([]) } }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>請求書 {detailInvoice?.invoice_id}</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? <TableSkeleton columns={7} rows={4} /> : (
            <InvoicePrintView details={details} invoiceId={detailInvoice?.invoice_id ?? ""} issuer={issuer} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
