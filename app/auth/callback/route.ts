// Google OAuth のコールバック処理
// Supabase がログイン後にここにリダイレクトしてくる
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // next パラメータがある場合はそちらへ（招待リンク経由のログイン）
  if (next) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // 通常ログインは状態判定ルートへ
  return NextResponse.redirect(`${origin}/auth/post-login`)
}
