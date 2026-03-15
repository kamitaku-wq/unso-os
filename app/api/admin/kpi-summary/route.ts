// 管理画面用の簡易KPIサマリーAPI（OWNER用）
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'

function getCurrentYm() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  try {
    const me = await requireRole(['OWNER'])
    const supabase = await createClient()
    const ym = getCurrentYm()

    // 会社の業種を判定
    const { data: company } = await supabase.from('companies').select('industry').eq('id', me.company_id).single()
    const industry = company?.industry ?? 'transport'

    const salesTable = industry === 'car_cleaning' ? 'cleaning_jobs' : 'billables'
    const dateCol = industry === 'car_cleaning' ? 'work_date' : 'run_date'
    const salesStatuses = ['APPROVED']
    const pendingStatus = industry === 'car_cleaning' ? 'REVIEW_REQUIRED' : 'REVIEW_REQUIRED'

    // 並列で全データ取得
    const [salesRes, expRes, pendingJobsRes, pendingExpRes] = await Promise.all([
      supabase.from(salesTable).select('amount').in('status', salesStatuses).eq('ym', ym),
      supabase.from('expenses').select('amount').in('status', ['APPROVED', 'PAID']).eq('ym', ym),
      supabase.from(salesTable).select('id', { count: 'exact', head: true }).eq('status', pendingStatus),
      supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    ])

    const sales = (salesRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
    const expenses = (expRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)

    return NextResponse.json({
      sales,
      expenses,
      profit: sales - expenses,
      pendingJobs: pendingJobsRes.count ?? 0,
      pendingExpenses: pendingExpRes.count ?? 0,
    }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } })
  } catch (e) {
    return apiError(e)
  }
}
