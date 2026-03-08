// 給与設定 API（一覧取得・登録・更新）
import { NextResponse } from 'next/server'
import { getSalarySettings, upsertSalarySetting } from '@/lib/server/payroll'
import { requireRole } from '@/lib/server/auth'
import { apiError } from '@/lib/api-error'

// 給与設定一覧を取得する
export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getSalarySettings()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

// 給与設定を登録・更新する
export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()

    const { emp_id, pay_type, basic_monthly, hourly_wage, overtime_rate, transport_allowance, standard_work_hours, note } = body

    if (!emp_id || !pay_type) {
      return NextResponse.json({ error: 'emp_id と pay_type は必須です' }, { status: 400 })
    }
    if (pay_type !== 'MONTHLY' && pay_type !== 'HOURLY') {
      return NextResponse.json({ error: 'pay_type は MONTHLY または HOURLY で指定してください' }, { status: 400 })
    }

    await upsertSalarySetting({
      emp_id,
      pay_type,
      basic_monthly: basic_monthly ?? null,
      hourly_wage: hourly_wage ?? null,
      overtime_rate: Number(overtime_rate ?? 1.25),
      transport_allowance: Number(transport_allowance ?? 0),
      standard_work_hours: Number(standard_work_hours ?? 160),
      note: note ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
