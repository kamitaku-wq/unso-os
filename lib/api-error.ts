// API エラーハンドリングの共通ユーティリティ
import { NextResponse } from 'next/server'
import { Logger } from 'next-axiom'

// エラーメッセージからステータスコードを決定して返す
export function apiError(e: unknown, fallback = '操作に失敗しました'): NextResponse {
  const message = e instanceof Error ? e.message : fallback
  const status =
    message === '未認証' ? 401 :
    message === '権限がありません' ? 403 :
    message.includes('見つかりません') ? 404 : 500

  // 500 エラーのみ Axiom に記録（認証・権限エラーは正常な業務フロー）
  if (status === 500) {
    const log = new Logger({ source: 'api' })
    log.error('API internal error', { message, error: String(e) })
    log.flush()
  }

  return NextResponse.json({ error: message }, { status })
}
