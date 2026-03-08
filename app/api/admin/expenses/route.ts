// 管理者用：経費一覧取得 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getAllExpenses } from '@/lib/core/expense'
import { requireRole } from '@/lib/core/auth'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const data = await getAllExpenses(status)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}
