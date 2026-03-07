// 勤怠 API（自分の一覧取得・新規申請）
import { NextResponse } from 'next/server'
import { getMyAttendances, createAttendance } from '@/lib/server/attendance'

export async function GET() {
  try {
    const data = await getMyAttendances()
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '申請に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
