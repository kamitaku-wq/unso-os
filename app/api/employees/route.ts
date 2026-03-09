// 全ロール向け：同じ会社の社員一覧（Todo送信先選択用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('未認証')

    const { data: me } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('google_email', user.email)
      .single()
    if (!me) throw new Error('社員情報が見つかりません')

    // 同じ会社のアクティブ社員を返す（自分を除く）
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, role')
      .eq('company_id', me.company_id)
      .eq('is_active', true)
      .neq('id', me.id)
      .order('name')
    if (error) throw new Error(error.message)

    return NextResponse.json(data ?? [])
  } catch (e) {
    return apiError(e)
  }
}
