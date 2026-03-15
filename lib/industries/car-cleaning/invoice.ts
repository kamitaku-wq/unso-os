// 清掃業務の請求書ロジック（店舗×期間でグルーピング）
import { createClient } from '@/lib/supabase/server'

// 請求対象の作業実績をプレビューする（承認済み・未請求のみ）
export async function previewCleaningInvoice(storeId: string, periodFrom: string, periodTo: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cleaning_jobs')
    .select('id, job_id, work_date, work_code, work_name, car_type_text, id_list_raw, qty, unit_price, amount, emp_id, store_name')
    .eq('store_id', storeId)
    .eq('status', 'APPROVED')
    .is('invoice_id', null)
    .gte('work_date', periodFrom)
    .lte('work_date', periodTo)
    .order('work_date')

  if (error) throw new Error(error.message)
  return data ?? []
}

// 請求書を発行する（対象実績に invoice_id を付与）
export async function createCleaningInvoice(storeId: string, periodFrom: string, periodTo: string) {
  const supabase = await createClient()

  const targets = await previewCleaningInvoice(storeId, periodFrom, periodTo)
  if (targets.length === 0) throw new Error('請求対象の実績がありません')

  const ym = periodTo.slice(0, 7).replace('-', '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const invoice_id = `CL-${ym}-${storeId}-${rand}`
  const now = new Date().toISOString()

  const ids = targets.map(t => t.id)
  const { error } = await supabase
    .from('cleaning_jobs')
    .update({
      invoice_id,
      invoiced_at: now,
      invoice_period_from: periodFrom,
      invoice_period_to: periodTo,
    })
    .in('id', ids)

  if (error) throw new Error(error.message)

  const totalAmount = targets.reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  return { invoice_id, count: targets.length, totalAmount, storeName: targets[0]?.store_name ?? storeId }
}

// 請求書一覧を取得する（invoice_id ごとに集計）
export async function getCleaningInvoices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cleaning_jobs')
    .select('invoice_id, store_id, store_name, invoice_period_from, invoice_period_to, invoiced_at, amount')
    .not('invoice_id', 'is', null)
    .order('invoiced_at', { ascending: false })

  if (error) throw new Error(error.message)

  const map = new Map<string, {
    invoice_id: string
    store_id: string
    store_name: string
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
        store_id: row.store_id ?? '',
        store_name: row.store_name ?? '',
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

// 請求書を削除する（invoice_id を null に戻す）
export async function deleteCleaningInvoice(invoiceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cleaning_jobs')
    .update({ invoice_id: null, invoiced_at: null, invoice_period_from: null, invoice_period_to: null })
    .eq('invoice_id', invoiceId)
    .select('id')

  if (error) throw new Error(error.message)
  return { deleted: data?.length ?? 0 }
}

// 請求書明細を取得する（作業種別サマリ + 車両ID明細）
export async function getCleaningInvoiceDetail(invoiceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cleaning_jobs')
    .select('job_id, work_date, work_code, work_name, car_type_text, id_list_raw, qty, unit_price, amount, emp_id, store_name, store_id, invoice_period_from, invoice_period_to, invoiced_at')
    .eq('invoice_id', invoiceId)
    .order('work_date')
    .order('work_name')

  if (error) throw new Error(error.message)
  return data ?? []
}
