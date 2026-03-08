// 勤怠 API（自分の一覧取得・新規申請）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getMyAttendances, createAttendance } from '@/lib/core/attendance'

export async function GET() {
  try {
    const data = await getMyAttendances()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createAttendance({
      work_date: body.work_date,
      clock_in: body.clock_in,
      clock_out: body.clock_out,
      break_min: body.break_min != null ? Number(body.break_min) : 60,
      drive_min: body.drive_min != null ? Number(body.drive_min) : null,
      note: body.note ?? null,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
