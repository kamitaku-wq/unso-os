// 新規ユーザー登録申請 API（ログイン済みなら誰でも使用可）
// 社員テーブルに未登録のユーザーが、管理者に登録申請を送る
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { submitEmpRequest } from '@/lib/core/employee'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const body = await request.json()
    const result = await submitEmpRequest({
      name: body.name,
      google_email: user.email!,
      role_requested: body.role_requested ?? 'DRIVER',
      company_id: body.company_id,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
