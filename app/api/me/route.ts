// 自分の社員情報を返す API（ナビゲーションのロール判定に使用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const { data: employee } = await supabase
      .from('employees')
      .select('emp_id, name, role, is_active, companies(custom_settings)')
      .eq('google_email', user.email!)
      .maybeSingle()

    if (!employee || !employee.is_active) {
      // 社員未登録：登録申請ページへ誘導
      return NextResponse.json({ registered: false, email: user.email }, { status: 200 })
    }

    // companies リレーションから custom_settings を抽出
    const companies = employee.companies as { custom_settings: Record<string, unknown> } | { custom_settings: Record<string, unknown> }[] | null
    const customSettings = Array.isArray(companies) ? companies[0]?.custom_settings : companies?.custom_settings
    const { companies: _c, ...rest } = employee

    return NextResponse.json({ registered: true, ...rest, custom_settings: customSettings ?? {} })
  } catch (e) {
    return apiError(e)
  }
}
