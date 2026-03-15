// シフトルーティン API（取得・保存・週への適用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getAllRoutines, saveRoutines, applyRoutinesToWeek } from '@/lib/core/shift-routine'
import { requireRole } from '@/lib/core/auth'

export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getAllRoutines()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    if (body.action === 'apply') {
      const count = await applyRoutinesToWeek(body.monday)
      return NextResponse.json({ ok: true, applied: count })
    }
    await saveRoutines({ emp_id: body.emp_id, routines: body.routines })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
