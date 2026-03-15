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

type Customer = { id: string; cust_id: string; name: string; address?: string }

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
  qty: number; unit_price: number; amount: number; price_note: string | null; emp_id: string | null
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

// 支払期限: 請求月の翌月末
function calcPaymentDue(periodTo: string): string {
  const d = new Date(periodTo)
  const due = new Date(d.getFullYear(), d.getMonth() + 2, 0)
  return `${due.getFullYear()}年${due.getMonth() + 1}月${due.getDate()}日`
}

// 明細行を車両ID単位に展開する（1行 = 1車両）
function expandDetails(details: DetailItem[]) {
  const rows: { idText: string; carName: string; workName: string; workDate: string; qty: number; unitPrice: number; amount: number; note: string }[] = []
  for (const d of details) {
    const ids = (d.id_list_raw ?? "").split(/[\n,]/).map(s => s.trim()).filter(Boolean)
    const carName = d.car_type_text ?? ""
    const workName = d.work_name ?? "その他"
    const workDate = d.work_date
    const unitPrice = Number(d.unit_price)
    const note = d.price_note ?? ""
    if (ids.length <= 1) {
      rows.push({ idText: ids[0] ?? "", carName, workName, workDate, qty: d.qty, unitPrice, amount: Number(d.amount), note })
    } else {
      for (const id of ids) {
        rows.push({ idText: id, carName, workName, workDate, qty: 1, unitPrice, amount: unitPrice, note })
      }
    }
  }
  return rows
}

// 印刷用 請求書ビュー（旧システムPDF準拠）
function InvoicePrintView({ details, invoiceId, issuer, customers }: {
  details: DetailItem[]; invoiceId: string; issuer: IssuerInfo; customers: Customer[]
}) {
  const printRef = useRef<HTMLDivElement>(null)
  if (details.length === 0) return null

  const storeId = details[0].store_id ?? ""
  const periodTo = details[0].invoice_period_to ?? ""
  const invoicedAt = details[0].invoiced_at ?? ""
  const invoicedAtFmt = (v: string) => { const d = new Date(v); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` }
  const invoicedAtStr = invoicedAt ? invoicedAtFmt(invoicedAt) : ""

  // 顧客マスタから正式名称・住所を取得
  const customer = customers.find(c => c.cust_id === storeId)
  const clientName = customer?.name ?? details[0].store_name ?? storeId
  const clientAddress = customer?.address ?? ""

  // 月表示（例: "2月分"）
  const periodMonth = periodTo ? `${Number(periodTo.slice(5, 7))}月分` : ""

  // 作業種別サマリ集計（表紙用）
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

  // 明細行を車両ID単位に展開
  const expandedRows = expandDetails(details)

  const printCSS = `
@media print { @page { margin: 10mm 14mm; size: A4; } body { padding:0; } }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family: "Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",sans-serif; color:#2d3748; margin:0; padding:20px 24px; font-size:9pt; line-height:1.6; }

/* ── 表紙タイトル ── */
.title-bar { background:#2c3e50; color:#fff; padding:12px 0; text-align:center; font-size:20pt; font-weight:700; letter-spacing:10px; margin-bottom:24px; }

/* ── 宛先 × 発行者（左右2カラム） ── */
.header-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; gap:32px; }

.client-section { flex:1; }
.client-address { font-size:9pt; color:#4a5568; margin-bottom:6px; line-height:1.5; }
.client-name { font-size:16pt; font-weight:700; color:#1a202c; border-bottom:2px solid #2c3e50; padding-bottom:6px; display:inline-block; margin-bottom:6px; }
.client-month { font-size:11pt; font-weight:600; color:#2c3e50; margin-top:4px; }

.issuer-section { text-align:right; font-size:8.5pt; line-height:1.7; color:#4a5568; min-width:220px; }
.issuer-section .name { font-weight:700; font-size:11pt; color:#1a202c; margin-bottom:2px; }
.issuer-section .meta { margin-top:10px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:8pt; color:#718096; }
.issuer-section .meta div { margin:1px 0; }

/* ── 請求金額ボックス ── */
.amount-box { border:2px solid #2c3e50; margin:0 0 24px; display:flex; align-items:center; }
.amount-box .label { background:#2c3e50; color:#fff; padding:16px 24px; font-size:11pt; font-weight:700; white-space:nowrap; letter-spacing:2px; }
.amount-box .value { padding:16px 28px; font-size:26pt; font-weight:700; color:#1a202c; letter-spacing:1px; font-variant-numeric:tabular-nums; }

/* ── 品目テーブル ── */
.cover-table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:9pt; }
.cover-table th { background:#2c3e50; color:#fff; padding:8px 14px; text-align:center; font-weight:400; font-size:8.5pt; }
.cover-table td { padding:7px 14px; border-bottom:1px solid #e2e8f0; vertical-align:middle; }
.cover-table td.r { text-align:right; font-variant-numeric:tabular-nums; }
.cover-table tr:last-child td { border-bottom:none; }
.cover-table tr.total-row td { font-weight:700; background:#f7fafc; border-top:2px solid #2c3e50; border-bottom:none; }

/* ── 税額・お支払い情報（グループ） ── */
.payment-group { background:#f7fafc; border:1px solid #e2e8f0; padding:16px 20px; margin-bottom:16px; }
.payment-group-title { font-size:9pt; font-weight:700; color:#2c3e50; margin-bottom:10px; letter-spacing:1px; }

.tax-table { border-collapse:collapse; font-size:8.5pt; margin-bottom:12px; }
.tax-table th { background:#edf2f7; padding:5px 14px; text-align:center; font-weight:400; border:1px solid #e2e8f0; color:#4a5568; }
.tax-table td { padding:5px 14px; text-align:right; border:1px solid #e2e8f0; font-variant-numeric:tabular-nums; }

.payment-details { display:flex; gap:32px; font-size:8.5pt; color:#4a5568; }
.payment-details .item { display:flex; gap:8px; }
.payment-details .item-label { font-weight:600; color:#2d3748; white-space:nowrap; }

/* ── 振込先 ── */
.bank-section { margin-bottom:12px; }
.bank-label { font-size:8.5pt; font-weight:600; color:#2c3e50; margin-bottom:4px; }
.bank-box { background:#fff; padding:10px 14px; font-size:9pt; border:1px solid #e2e8f0; line-height:1.7; color:#2d3748; }

/* ── 備考 ── */
.notes { font-size:8pt; color:#a0aec0; line-height:1.6; }
.notes p { margin:1px 0; }

/* ── 明細ページ ── */
.page-break { page-break-before:always; }
.detail-title { background:#2c3e50; color:#fff; padding:10px 0; font-size:16pt; font-weight:700; text-align:center; letter-spacing:10px; margin-bottom:10px; }
.detail-client { font-size:9pt; color:#4a5568; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #e2e8f0; }

table.detail { width:100%; border-collapse:collapse; font-size:8pt; }
table.detail th { background:#2c3e50; color:#fff; padding:6px 8px; text-align:center; font-weight:400; font-size:7.5pt; white-space:nowrap; }
table.detail td { padding:5px 8px; border-bottom:1px solid #edf2f7; font-size:8pt; }
table.detail tr { page-break-inside:avoid; }
table.detail td.r { text-align:right; font-variant-numeric:tabular-nums; }
table.detail tr:nth-child(even) td { background:#f7fafc; }
.detail-total-row td { font-weight:700; background:#edf2f7 !important; border-top:2px solid #2c3e50 !important; }
.detail-tax-row td { color:#718096; border-top:none !important; }
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
        <div className="page">
          <div className="title-bar">請　求　書</div>

          <div className="header-row">
            <div className="client-section">
              {clientAddress && <div className="client-address">{clientAddress}</div>}
              <div className="client-name">{clientName}　様</div>
              <div className="client-month">{periodMonth}</div>
            </div>
            <div className="issuer-section">
              {issuer.issuer_name && <div className="name">{issuer.issuer_name}</div>}
              {issuer.issuer_address && <div>{issuer.issuer_address}</div>}
              {issuer.issuer_tel && <div>TEL: {issuer.issuer_tel}</div>}
              {issuer.tax_id && <div>登録番号: {issuer.tax_id}</div>}
              <div className="meta">
                <div>発行日: {invoicedAtStr}</div>
                <div>No. {invoiceId}</div>
              </div>
            </div>
          </div>

          <div className="amount-box">
            <div className="label">請求金額</div>
            <div className="value">{fmtCur(total)}</div>
          </div>

          <table className="cover-table">
            <thead>
              <tr><th style={{width:"40%"}}>商品名/品目</th><th>数量</th><th>単価</th><th>金額</th><th>備考</th></tr>
            </thead>
            <tbody>
              {workSummaries.map(w => (
                <tr key={w.work_name}>
                  <td>{w.work_name}</td>
                  <td className="r">{w.qty}</td>
                  <td className="r">{w.qty > 0 ? fmtCur(Math.round(w.amount / w.qty)) : "-"}</td>
                  <td className="r">{fmtCur(w.amount)}</td>
                  <td></td>
                </tr>
              ))}
              <tr className="total-row">
                <td>小計</td><td></td><td></td><td className="r">{fmtCur(subtotal)}</td><td></td>
              </tr>
            </tbody>
          </table>

          <div className="payment-group">
            <table className="tax-table">
              <thead><tr><th>税率</th><th>対象額</th><th>消費税額</th></tr></thead>
              <tbody><tr><td>10%</td><td>{fmtCur(subtotal)}</td><td>{fmtCur(tax)}</td></tr></tbody>
            </table>

            <div className="payment-details">
              <div className="item"><span className="item-label">発行日:</span><span>{invoicedAtStr}</span></div>
              <div className="item"><span className="item-label">請求書番号:</span><span>{invoiceId}</span></div>
              <div className="item"><span className="item-label">お支払期限:</span><span>{periodTo ? calcPaymentDue(periodTo) : "-"}</span></div>
            </div>

            {issuer.bank_info && (
              <div className="bank-section">
                <div className="bank-label">■ お振込先</div>
                <div className="bank-box">{issuer.bank_info}</div>
              </div>
            )}

            <div className="notes">
              <p>※ お振込手数料はご負担くださいますようお願い申し上げます。</p>
            </div>
          </div>
        </div>

        {/* === 明細 === */}
        <div className="page-break page">
          <div className="detail-title">明　　細</div>
          <div className="detail-client">{clientName}　{periodMonth}</div>
          <table className="detail">
            <thead>
              <tr>
                <th style={{width:"28%"}}>商品名/品目</th>
                <th style={{width:"14%"}}>作業項目</th>
                <th style={{width:"8%"}}>作業日</th>
                <th style={{width:"8%"}}>数量</th>
                <th style={{width:"10%"}}>単価</th>
                <th style={{width:"10%"}}>金額</th>
                <th style={{width:"22%"}}>備考</th>
              </tr>
            </thead>
            <tbody>
              {expandedRows.map((r, ri) => (
                <tr key={ri}>
                  <td>{[r.idText, r.carName].filter(Boolean).join(" ")}</td>
                  <td>{r.workName}</td>
                  <td>{r.workDate ? r.workDate.slice(5).replace("-", "/") : "-"}</td>
                  <td className="r">{r.qty}</td>
                  <td className="r">{fmtCur(r.unitPrice)}</td>
                  <td className="r">{fmtCur(r.amount)}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
              <tr className="detail-total-row">
                <td>小計</td><td></td><td></td><td className="r">{expandedRows.length}</td><td></td><td className="r">{fmtCur(subtotal)}</td><td></td>
              </tr>
              <tr className="detail-tax-row"><td>消費税（10%）</td><td></td><td></td><td></td><td></td><td className="r">{fmtCur(tax)}</td><td></td></tr>
              <tr className="detail-total-row"><td>合計（税込）</td><td></td><td></td><td></td><td></td><td className="r">{fmtCur(total)}</td><td></td></tr>
            </tbody>
          </table>
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
            <InvoicePrintView details={details} invoiceId={detailInvoice?.invoice_id ?? ""} issuer={issuer} customers={customers} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
