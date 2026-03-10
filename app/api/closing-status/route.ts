// 締め済み月一覧取得（全ロール対応 - フォームの入力ロックに使用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getMyEmployee } from '@/lib/core/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // 社員として登録済みのユーザーのみアクセス可（RLS が company_id フィルタを担う）
    await getMyEmployee()
    const supabase = await createClient()

    const { data } = await supabase
      .from('monthly_closings')
      .select('ym')
      .order('ym', { ascending: false })

    return NextResponse.json({
      closedMonths: (data ?? []).map((d) => d.ym),
    })
  } catch (e) {
    return apiError(e)
  }
}
