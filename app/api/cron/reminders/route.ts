// Vercel Cron: 経費締めリマインド + 日報未報告リマインド
import { NextResponse } from 'next/server'
import { createExpenseClosingReminders, createDailyReportReminders } from '@/lib/core/cron-reminders'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  try {
    const [expense, report] = await Promise.all([
      createExpenseClosingReminders(),
      createDailyReportReminders(),
    ])
    return NextResponse.json({ ok: true, expense, report })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
