// 締め期間別の経費一覧取得 API（submitted_at 基準）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getExpensesByClosingPeriod } from '@/lib/core/expense'
import { requireRole } from '@/lib/core/auth'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (!start || !end) throw new Error('start / end パラメータが必要です')
    const data = await getExpensesByClosingPeriod(start, end)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}
