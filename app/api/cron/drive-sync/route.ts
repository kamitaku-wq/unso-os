// Vercel Cron: 未転送のレシート画像を Google Drive に転送する
// vercel.json で schedule を設定して定期実行する
import { NextResponse } from 'next/server'
import { syncReceiptsToDrive } from '@/lib/core/drive-sync'

export async function GET(request: Request) {
  // Vercel Cron の認証（CRON_SECRET ヘッダーを検証）
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncReceiptsToDrive()
  return NextResponse.json(result)
}
