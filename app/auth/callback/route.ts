// Google OAuth のコールバック処理
// Supabase がログイン後にここにリダイレクトしてくる
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // ログイン成功後は状態判定ルートへ送る
  return NextResponse.redirect(`${origin}/auth/post-login`)
}
