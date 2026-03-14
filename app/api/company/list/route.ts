// ログインユーザーが所属する会社一覧を返す
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: '未認証' }, { status: 401 })

    // admin クライアントで RLS をバイパスして全社の所属情報を取得
    const admin = createAdminClient()
    const { data: employees, error } = await admin
      .from('employees')
      .select('company_id, role, companies!inner(id, name, is_demo, custom_settings)')
      .eq('google_email', user.email)
      .eq('is_active', true)

    if (error) throw new Error('会社一覧の取得に失敗しました')

    type CompanyInfo = { id: string; name: string; is_demo: boolean; custom_settings: Record<string, unknown> | null }
    type EmpRow = { company_id: string; role: string; companies: CompanyInfo[] | CompanyInfo }

    const companies = ((employees as unknown as EmpRow[]) ?? []).map((e) => {
      const c = Array.isArray(e.companies) ? e.companies[0] : e.companies
      return {
        id: e.company_id,
        name: (c?.custom_settings?.app_name as string) || c?.name || '',
        is_demo: c?.is_demo ?? false,
        role: e.role,
      }
    })

    return NextResponse.json(companies)
  } catch (e) {
    return apiError(e)
  }
}
