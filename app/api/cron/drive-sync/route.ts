// Vercel Cron: 未転送のレシート画像を Google Drive に転送する
// vercel.json で schedule を設定して定期実行する
import { NextResponse } from 'next/server'
import { getVercelOidcToken } from '@vercel/oidc'
import { syncReceiptsToDrive } from '@/lib/core/drive-sync'

export async function GET(request: Request) {
  // Vercel Cron の認証（CRON_SECRET ヘッダーを検証）
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Vercel OIDC トークンを取得（リクエストハンドラー内でのみ有効）
  let oidcToken: string | undefined
  try {
    oidcToken = await getVercelOidcToken()
  } catch {
    return NextResponse.json({ synced: 0, errors: ['OIDC トークンの取得に失敗しました'] })
  }

  const result = await syncReceiptsToDrive(oidcToken)
  return NextResponse.json(result)
}
