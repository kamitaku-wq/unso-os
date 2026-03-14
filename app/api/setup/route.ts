// 初回セットアップ API（会社作成 + 最初の OWNER 登録）
// サービスロールキーで RLS をスキップして実行する
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // ログイン済みであることを確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const body = await request.json()
    const { company_name, owner_name } = body

    if (!company_name || !owner_name) {
      return NextResponse.json({ error: '会社名と氏名は必須です' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 同じユーザーが既に OWNER として登録済みの会社があればエラー
    const { data: existingOwner } = await admin
      .from('employees')
      .select('id')
      .eq('google_email', user.email!)
      .eq('role', 'OWNER')
      .maybeSingle()

    if (existingOwner) {
      return NextResponse.json({ error: 'すでにオーナーとして登録済みの会社があります' }, { status: 409 })
    }

    // 参加コード（8文字英数字）を生成
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const company_code = Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    // 会社を作成
    const { data: company, error: companyErr } = await admin
      .from('companies')
      .insert({ name: company_name, plan: 'standard', company_code })
      .select('id, company_code')
      .single()

    if (companyErr || !company) throw new Error('会社の作成に失敗しました')

    // 最初の OWNER を登録
    const { error: empErr } = await admin.from('employees').insert({
      company_id: company.id,
      emp_id: 'EMP001',
      name: owner_name,
      google_email: user.email!,
      role: 'OWNER',
      is_active: true,
    })

    if (empErr) throw new Error('社員登録に失敗しました: ' + empErr.message)

    return NextResponse.json({ ok: true, company_id: company.id, company_code: company.company_code })
  } catch (e) {
    return apiError(e)
  }
}

// セットアップ済みかどうかを確認する
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    // このユーザーが既に OWNER の会社を持っているかを確認
    const admin = createAdminClient()
    const { data: ownerEmp } = await admin
      .from('employees')
      .select('id')
      .eq('google_email', user.email!)
      .eq('role', 'OWNER')
      .maybeSingle()

    return NextResponse.json({ setup_done: !!ownerEmp })
  } catch (e) {
    return apiError(e)
  }
}
