// デモ用自動登録API（サービスロールでRLSをバイパスして社員を即時登録）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // ログインユーザーを確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: '未認証' }, { status: 401 })

    // サービスロールでRLSをバイパス
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 会社を取得（is_demo フラグも含む）
    const { data: company } = await admin
      .from('companies')
      .select('id, is_demo')
      .limit(1)
      .single()
    if (!company) return NextResponse.json({ error: '会社が未登録です' }, { status: 400 })

    // デモ会社でない場合は自動登録しない
    if (!company.is_demo) {
      return NextResponse.json({ registered: false })
    }

    // 既に登録済みなら何もしない
    const { data: existing } = await admin
      .from('employees')
      .select('emp_id')
      .eq('google_email', user.email)
      .maybeSingle()
    if (existing) return NextResponse.json({ registered: true, emp_id: existing.emp_id })

    // emp_id を採番
    const { count } = await admin
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
    const empNum = String((count ?? 0) + 1).padStart(3, '0')
    const emp_id = `EMP${empNum}`

    // メールアドレスの @ 前をデフォルト名に使用
    const defaultName = user.email.split('@')[0]

    // 社員を自動登録（WORKER）
    const { error } = await admin.from('employees').insert({
      company_id: company.id,
      emp_id,
      name: user.user_metadata?.full_name ?? defaultName,
      google_email: user.email,
      role: 'WORKER',
      is_active: true,
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ registered: true, emp_id })
  } catch (e) {
    return apiError(e)
  }
}
