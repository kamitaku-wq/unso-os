// 管理者用：社員申請一覧取得 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getEmpRequests } from '@/lib/core/employee'
import { requireRole } from '@/lib/core/auth'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'PENDING'
    const data = await getEmpRequests(status)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}
