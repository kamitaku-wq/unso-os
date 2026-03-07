// 管理者用：経費一覧取得 API
import { NextResponse } from 'next/server'
import { getAllExpenses } from '@/lib/server/expense'
import { requireRole } from '@/lib/server/auth'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const data = await getAllExpenses(status)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
