// 会社切替API
// GET: ブラウザから直接アクセス → Cookie 設定 + リダイレクト
// POST: 従来の fetch 呼び出し用（後方互換）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
}

// ブラウザ直接ナビゲーション用（Cookie + リダイレクトを同一レスポンスで返す）
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companyId = url.searchParams.get('id')
    const redirectTo = url.searchParams.get('redirect') || '/'

    if (!companyId) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.redirect(new URL('/login', request.url))

    const admin = createAdminClient()
    const { data: emp } = await admin
      .from('employees')
      .select('id')
      .eq('google_email', user.email)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    if (!emp) return NextResponse.redirect(new URL('/select-company', request.url))

    const response = NextResponse.redirect(new URL(redirectTo, request.url))
    response.cookies.set('x-company-id', companyId, COOKIE_OPTIONS)
    return response
  } catch (e) {
    return apiError(e)
  }
}

// 従来の fetch 呼び出し用（後方互換）
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const { company_id } = (await request.json()) as { company_id: string }
    if (!company_id) return NextResponse.json({ error: 'company_id は必須です' }, { status: 400 })

    const admin = createAdminClient()
    const { data: emp } = await admin
      .from('employees')
      .select('id')
      .eq('google_email', user.email)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!emp) return NextResponse.json({ error: 'この会社に所属していません' }, { status: 403 })

    const response = NextResponse.json({ ok: true })
    response.cookies.set('x-company-id', company_id, COOKIE_OPTIONS)
    return response
  } catch (e) {
    return apiError(e)
  }
}
