// シフト API（週間取得・登録/更新）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getMyEmployee } from '@/lib/core/auth'
import { getShifts, upsertShift, getEmployeesForShift } from '@/lib/core/shift'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from || !to) {
      return NextResponse.json({ error: 'from と to パラメータが必要です' }, { status: 400 })
    }
    const [me, shifts, employees] = await Promise.all([
      getMyEmployee().catch(() => null),
      getShifts(from, to),
      getEmployeesForShift(),
    ])
    const role = me?.role ?? null
    return NextResponse.json({ shifts, employees, role })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await upsertShift({
      emp_id: body.emp_id,
      shift_date: body.shift_date,
      is_day_off: Boolean(body.is_day_off),
      location: body.location ?? null,
      work_type: body.work_type ?? null,
      note: body.note ?? null,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
