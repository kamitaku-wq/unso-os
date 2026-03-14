// シフト API（週間取得・登録/更新）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { getMyEmployee } from '@/lib/core/auth'
import { getShifts, upsertShift, getEmployeesForShift } from '@/lib/core/shift'

// 日報サマリーを取得する（シフト表に表示用）
async function getDailyReportSummaries(from: string, to: string) {
  const supabase = await createClient()

  // 勤怠データ
  const { data: attendances } = await supabase
    .from('attendances')
    .select('emp_id, work_date, clock_in, clock_out, status')
    .gte('work_date', from)
    .lte('work_date', to)

  // 作業実績データ
  const { data: jobs } = await supabase
    .from('cleaning_jobs')
    .select('emp_id, work_date, amount, status')
    .gte('work_date', from)
    .lte('work_date', to)
    .neq('status', 'VOID')

  // emp_id + work_date ごとに集計
  const map = new Map<string, { clockIn: string | null; clockOut: string | null; totalAmount: number; jobCount: number }>()

  for (const a of attendances ?? []) {
    const key = `${a.emp_id}_${a.work_date}`
    const entry = map.get(key) ?? { clockIn: null, clockOut: null, totalAmount: 0, jobCount: 0 }
    entry.clockIn = a.clock_in ? a.clock_in.slice(11, 16) : null
    entry.clockOut = a.clock_out ? a.clock_out.slice(11, 16) : null
    map.set(key, entry)
  }

  for (const j of jobs ?? []) {
    const key = `${j.emp_id}_${j.work_date}`
    const entry = map.get(key) ?? { clockIn: null, clockOut: null, totalAmount: 0, jobCount: 0 }
    entry.totalAmount += Number(j.amount) || 0
    entry.jobCount += 1
    map.set(key, entry)
  }

  return Object.fromEntries(map)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from || !to) {
      return NextResponse.json({ error: 'from と to パラメータが必要です' }, { status: 400 })
    }
    const [me, shifts, employees, dailySummaries] = await Promise.all([
      getMyEmployee().catch(() => null),
      getShifts(from, to),
      getEmployeesForShift(),
      getDailyReportSummaries(from, to).catch(() => ({})),
    ])
    const role = me?.role ?? null
    return NextResponse.json({ shifts, employees, role, dailySummaries })
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
