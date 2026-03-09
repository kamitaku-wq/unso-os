// 管理画面タブ用の承認待ち件数を一括取得（タブバッジ表示に使用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireRole } from '@/lib/core/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const supabase = await createClient()

    const [billablesRes, expensesRes, empRequestsRes] = await Promise.all([
      supabase
        .from('billables')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'REVIEW_REQUIRED'),
      supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'SUBMITTED'),
      supabase
        .from('emp_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
    ])

    return NextResponse.json({
      billables: billablesRes.count ?? 0,
      expenses: expensesRes.count ?? 0,
      empRequests: empRequestsRes.count ?? 0,
    })
  } catch (e) {
    return apiError(e)
  }
}
