// 新規ユーザー登録申請 API（ログイン済みなら誰でも使用可）
// 社員テーブルに未登録のユーザーが、管理者に登録申請を送る
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { submitEmpRequest } from '@/lib/core/employee'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const body = await request.json()

    // company_code（参加コード）から company_id を解決する
    const admin = createAdminClient()
    const { data: company, error: companyErr } = await admin
      .from('companies')
      .select('id')
      .eq('company_code', (body.company_code ?? '').trim().toUpperCase())
      .maybeSingle()

    if (companyErr) throw new Error('会社情報の取得に失敗しました')
    if (!company) return NextResponse.json({ error: '参加コードが正しくありません' }, { status: 400 })

    const result = await submitEmpRequest({
      name: body.name,
      google_email: user.email!,
      role_requested: body.role_requested ?? 'DRIVER',
      company_id: company.id,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
