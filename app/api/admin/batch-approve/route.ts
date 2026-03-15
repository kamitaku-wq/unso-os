// 一括承認 API（清掃作業・経費をまとめて承認する）
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'
import { approveCleaningJob } from '@/lib/industries/car-cleaning/job'
import { approveExpense } from '@/lib/core/expense'

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

    const results = { approved: 0, errors: [] as string[] }

    for (const id of body.ids) {
      try {
        if (body.type === 'cleaning_job') {
          await approveCleaningJob(id)
        } else if (body.type === 'expense') {
          await approveExpense(id, employee.name)
        } else {
          results.errors.push(`${id}: 不明な種別です`)
          continue
        }
        results.approved++
      } catch (e) {
        results.errors.push(`${id}: ${e instanceof Error ? e.message : 'unknown'}`)
      }
    }

    return NextResponse.json(results)
  } catch (e) {
    return apiError(e)
  }
}
