// 一括承認 API（清掃作業・経費をまとめて承認する）
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'
import { bulkApproveCleaningJobs } from '@/lib/industries/car-cleaning/job'
import { bulkApproveExpenses } from '@/lib/core/expense'

export async function POST(request: Request) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json() as { type: string; ids: string[] }

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: '承認対象を選択してください' }, { status: 400 })
    }
    if (body.ids.length > 100) {
      return NextResponse.json({ error: '一度に承認できるのは100件までです' }, { status: 400 })
    }

    let approved: number
    if (body.type === 'cleaning_job') {
      approved = await bulkApproveCleaningJobs(body.ids, employee.emp_id)
    } else if (body.type === 'expense') {
      approved = await bulkApproveExpenses(body.ids, employee.name)
    } else {
      return NextResponse.json({ error: '不明な種別です' }, { status: 400 })
    }

    return NextResponse.json({ approved, errors: [] })
  } catch (e) {
    return apiError(e)
  }
}
