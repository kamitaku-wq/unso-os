// 自分自身のロールを変更するAPI（デモ会社専用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getMyEmployee } from '@/lib/core/auth'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function PATCH(request: Request) {
  try {
    const employee = await getMyEmployee()

    // デモ会社かどうかを確認
    const supabase = await createClient()
    const { data: company } = await supabase
      .from('companies')
      .select('is_demo')
      .eq('id', employee.company_id)
      .single()

    if (!company?.is_demo) {
      return NextResponse.json({ error: 'この機能はデモ環境でのみ利用できます' }, { status: 403 })
    }

    const { role } = await request.json()
    const validRoles = ['WORKER', 'ADMIN', 'OWNER']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '無効なロールです' }, { status: 400 })
    }

    // サービスロールでRLSをバイパスして自分のロールを更新
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error } = await admin
      .from('employees')
      .update({ role })
      .eq('id', employee.id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ role })
  } catch (e) {
    return apiError(e)
  }
}
