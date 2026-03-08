// 自分自身のロールを変更するAPI（デモ用・全ユーザー利用可）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const { role } = await request.json()
    const validRoles = ['DRIVER', 'ADMIN', 'OWNER']
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
      .eq('google_email', user.email)

    if (error) throw new Error(error.message)

    return NextResponse.json({ role })
  } catch (e) {
    return apiError(e)
  }
}
