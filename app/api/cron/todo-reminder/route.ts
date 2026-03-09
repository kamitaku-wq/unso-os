// 期日当日のTodoリマインダー（Vercel Cronから毎日朝8時に呼ばれる）
import { NextResponse } from 'next/server'
import { sendDueDateReminders } from '@/lib/core/push'

export async function GET(request: Request) {
  // Vercel Cronからのリクエストのみ受け付ける
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  try {
    await sendDueDateReminders()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
