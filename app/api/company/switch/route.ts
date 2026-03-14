// 会社切替API（Cookie に選択した company_id を保存する）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const { company_id } = (await request.json()) as { company_id: string }
    if (!company_id) return NextResponse.json({ error: 'company_id は必須です' }, { status: 400 })

    // 所属確認（admin で RLS バイパス）
    const admin = createAdminClient()
    const { data: emp } = await admin
      .from('employees')
      .select('id')
      .eq('google_email', user.email)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!emp) return NextResponse.json({ error: 'この会社に所属していません' }, { status: 403 })

    // Cookie に company_id を保存
    const response = NextResponse.json({ ok: true })
    response.cookies.set('x-company-id', company_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return response
  } catch (e) {
    return apiError(e)
  }
}
