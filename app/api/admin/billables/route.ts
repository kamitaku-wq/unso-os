// 管理者用：運行実績一覧取得 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getAllBillables } from '@/lib/industries/transport/billable'
import { requireRole } from '@/lib/core/auth'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const data = await getAllBillables(status)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}
