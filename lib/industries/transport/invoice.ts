// 請求書のサーバー側ビジネスロジック
// 承認済み運行実績を荷主×期間でまとめて invoice_id を付与する
import { createClient } from '@/lib/supabase/server'

// 請求対象の実績をプレビューする（まだ請求書未発行・承認済みのみ）
export async function previewInvoice(custId: string, periodFrom: string, periodTo: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billables')
    .select('id, billable_id, run_date, emp_id, route_id, pickup_loc, drop_loc, amount, vehicle_id, distance_km, note')
    .eq('cust_id', custId)
    .eq('status', 'APPROVED')
    .is('invoice_id', null)
    .gte('run_date', periodFrom)
    .lte('run_date', periodTo)
    .order('run_date')

  if (error) throw new Error(error.message)
  return data ?? []
}

// 請求書を発行する（対象実績に invoice_id を付与）
export async function createInvoice(custId: string, periodFrom: string, periodTo: string) {
  const supabase = await createClient()

  const targets = await previewInvoice(custId, periodFrom, periodTo)
  if (targets.length === 0) throw new Error('請求対象の実績がありません')

  const ym = periodTo.slice(0, 7).replace('-', '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const invoice_id = `INV-${ym}-${custId}-${rand}`
  const now = new Date().toISOString()

  const ids = targets.map(t => t.id)
  const { error } = await supabase
    .from('billables')
    .update({
      invoice_id,
      invoiced_at: now,
      invoice_period_from: periodFrom,
      invoice_period_to: periodTo,
    })
    .in('id', ids)

  if (error) throw new Error(error.message)

  const totalAmount = targets.reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  return { invoice_id, count: targets.length, totalAmount }
}

// 請求書一覧を取得する（invoice_id ごとに集計）
export async function getInvoices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billables')
    .select('invoice_id, cust_id, invoice_period_from, invoice_period_to, invoiced_at, amount')
    .not('invoice_id', 'is', null)
    .order('invoiced_at', { ascending: false })

  if (error) throw new Error(error.message)

  const map = new Map<string, {
    invoice_id: string
    cust_id: string
    invoice_period_from: string
    invoice_period_to: string
    invoiced_at: string
    count: number
    total_amount: number
  }>()

  for (const row of data ?? []) {
    if (!row.invoice_id) continue
    if (!map.has(row.invoice_id)) {
      map.set(row.invoice_id, {
        invoice_id: row.invoice_id,
        cust_id: row.cust_id ?? '',
        invoice_period_from: row.invoice_period_from ?? '',
        invoice_period_to: row.invoice_period_to ?? '',
        invoiced_at: row.invoiced_at ?? '',
        count: 0,
        total_amount: 0,
      })
    }
    const entry = map.get(row.invoice_id)!
    entry.count += 1
    entry.total_amount += Number(row.amount ?? 0)
  }

  return Array.from(map.values())
}

// 請求書の明細を取得する（特定 invoice_id の実績一覧）
export async function getInvoiceDetail(invoiceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billables')
    .select('billable_id, run_date, emp_id, cust_id, route_id, pickup_loc, drop_loc, amount, vehicle_id, distance_km, note, invoice_period_from, invoice_period_to, invoiced_at')
    .eq('invoice_id', invoiceId)
    .order('run_date')

  if (error) throw new Error(error.message)
  return data ?? []
}
