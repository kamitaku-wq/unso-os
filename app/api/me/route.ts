// 自分の社員情報を返す API（ナビゲーションのロール判定に使用）
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const { data: employee } = await supabase
      .from('employees')
      .select('emp_id, name, role, is_active')
      .eq('google_email', user.email!)
      .maybeSingle()

    if (!employee || !employee.is_active) {
      // 社員未登録：登録申請ページへ誘導
      return NextResponse.json({ registered: false, email: user.email }, { status: 200 })
    }

    return NextResponse.json({ registered: true, ...employee })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
