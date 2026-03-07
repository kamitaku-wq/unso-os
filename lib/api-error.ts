// API エラーハンドリングの共通ユーティリティ
import { NextResponse } from 'next/server'

// エラーメッセージからステータスコードを決定して返す
export function apiError(e: unknown, fallback = '操作に失敗しました'): NextResponse {
  const message = e instanceof Error ? e.message : fallback
  const status =
    message === '未認証' ? 401 :
    message === '権限がありません' ? 403 :
    message.includes('見つかりません') ? 404 : 500
  return NextResponse.json({ error: message }, { status })
}
