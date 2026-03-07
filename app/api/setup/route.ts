// 初回セットアップ API（会社作成 + 最初の OWNER 登録）
// サービスロールキーで RLS をスキップして実行する
import { NextResponse } from 'next/server'
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

    const { count: companyCount, error: companyCountError } = await admin
      .from('companies')
      .select('id', { count: 'exact', head: true })

    if (companyCountError) {
      throw new Error('会社情報の確認に失敗しました')
    }

    if ((companyCount ?? 0) > 0) {
      return NextResponse.json({ error: '初回セットアップは完了済みです' }, { status: 409 })
    }

    // すでに同じメールで社員登録済みならエラー
    const { data: existing } = await admin
      .from('employees')
      .select('id')
      .eq('google_email', user.email!)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'すでに登録済みです' }, { status: 409 })
    }

    // 会社を作成
    const { data: company, error: companyErr } = await admin
      .from('companies')
      .insert({ name: company_name, plan: 'standard' })
      .select('id')
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

    return NextResponse.json({ ok: true, company_id: company.id })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'セットアップに失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// セットアップ済みかどうかを確認する
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const admin = createAdminClient()
    const { count, error } = await admin
      .from('companies')
      .select('id', { count: 'exact', head: true })

    if (error) throw new Error('確認に失敗しました')

    return NextResponse.json({ setup_done: (count ?? 0) > 0 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '確認に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
