// 経費一括承認 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { bulkApproveExpenses } from '@/lib/core/expense'
import { requireRole, getMyEmployee } from '@/lib/core/auth'

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const employee = await getMyEmployee()
    const { ids } = (await request.json()) as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('承認対象の ID が必要です')
    const count = await bulkApproveExpenses(ids, employee.name)
    return NextResponse.json({ approved: count })
  } catch (e) {
    return apiError(e)
  }
}
