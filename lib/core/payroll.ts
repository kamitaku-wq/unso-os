// 給与計算ロジック
import { createClient } from '@/lib/supabase/server'
import { getMyEmployee } from '@/lib/core/auth'

export type PayType = 'MONTHLY' | 'HOURLY'
export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID'

export type SalarySetting = {
  id: string
  emp_id: string
  emp_name: string
  pay_type: PayType
  basic_monthly: number | null
  hourly_wage: number | null
  overtime_rate: number
  transport_allowance: number
  standard_work_hours: number
  note: string | null
}

export type Payroll = {
  id: string
  emp_id: string
  emp_name: string
  ym: string
  basic_pay: number
  overtime_pay: number
  transport_allowance: number
  expense_reimbursement: number
  gross_pay: number
  work_hours: number
  overtime_hours: number
  status: PayrollStatus
  note: string | null
  confirmed_at: string | null
  paid_at: string | null
  created_at: string
}

// 社員 ID → 名前のマップを作る
async function buildNameMap(empIds: string[]): Promise<Record<string, string>> {
  if (empIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase.from('employees').select('emp_id, name').in('emp_id', empIds)
  return Object.fromEntries((data ?? []).map(e => [e.emp_id, e.name]))
}

// 給与設定一覧を取得する
export async function getSalarySettings(): Promise<SalarySetting[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('salary_settings')
    .select('id, emp_id, pay_type, basic_monthly, hourly_wage, overtime_rate, transport_allowance, standard_work_hours, note')
    .order('emp_id')

  if (error) throw new Error(error.message)

  const nameMap = await buildNameMap((data ?? []).map(s => s.emp_id))

  return (data ?? []).map(s => ({
    ...s,
    emp_name: nameMap[s.emp_id] ?? s.emp_id,
    overtime_rate: Number(s.overtime_rate),
    transport_allowance: Number(s.transport_allowance),
    standard_work_hours: Number(s.standard_work_hours),
  }))
}

// 給与設定を登録・更新する（emp_id ごとに upsert）
export async function upsertSalarySetting(params: {
  emp_id: string
  pay_type: PayType
  basic_monthly: number | null
  hourly_wage: number | null
  overtime_rate: number
  transport_allowance: number
  standard_work_hours: number
  note: string | null
}) {
  const supabase = await createClient()
  const employee = await getMyEmployee()

  const { error } = await supabase
    .from('salary_settings')
    .upsert(
      {
        company_id: employee.company_id,
        emp_id: params.emp_id,
        pay_type: params.pay_type,
        basic_monthly: params.basic_monthly,
        hourly_wage: params.hourly_wage,
        overtime_rate: params.overtime_rate,
        transport_allowance: params.transport_allowance,
        standard_work_hours: params.standard_work_hours,
        note: params.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,emp_id' }
    )

  if (error) throw new Error(error.message)
}

// 指定月の給与一覧を取得する
export async function getPayrolls(ym: string): Promise<Payroll[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payrolls')
    .select('id, emp_id, ym, basic_pay, overtime_pay, transport_allowance, expense_reimbursement, gross_pay, work_hours, overtime_hours, status, note, confirmed_at, paid_at, created_at')
    .eq('ym', ym)
    .order('emp_id')

  if (error) throw new Error(error.message)

  const nameMap = await buildNameMap((data ?? []).map(p => p.emp_id))

  return (data ?? []).map(p => ({
    ...p,
    emp_name: nameMap[p.emp_id] ?? p.emp_id,
    work_hours: Number(p.work_hours),
    overtime_hours: Number(p.overtime_hours),
  }))
}

// 指定月の給与を勤怠データから計算して DRAFT として保存する
export async function calculatePayroll(ym: string): Promise<Payroll[]> {
  const supabase = await createClient()
  const employee = await getMyEmployee()

  const settings = await getSalarySettings()
  if (settings.length === 0) throw new Error('給与設定が登録されていません')

  const monthStart = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`
  const monthEnd = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-31`

  const { data: attendances, error: attError } = await supabase
    .from('attendances')
    .select('emp_id, work_min, overtime_min')
    .eq('status', 'APPROVED')
    .gte('work_date', monthStart)
    .lte('work_date', monthEnd)
    .in('emp_id', settings.map(s => s.emp_id))

  if (attError) throw new Error(attError.message)

  const attByEmp: Record<string, { workMin: number; overtimeMin: number }> = {}
  for (const row of attendances ?? []) {
    if (!attByEmp[row.emp_id]) attByEmp[row.emp_id] = { workMin: 0, overtimeMin: 0 }
    attByEmp[row.emp_id].workMin += Number(row.work_min ?? 0)
    attByEmp[row.emp_id].overtimeMin += Number(row.overtime_min ?? 0)
  }

  for (const setting of settings) {
    const { data: existing } = await supabase
      .from('payrolls')
      .select('status')
      .eq('company_id', employee.company_id)
      .eq('emp_id', setting.emp_id)
      .eq('ym', ym)
      .maybeSingle()

    if (existing && existing.status !== 'DRAFT') continue

    const att = attByEmp[setting.emp_id] ?? { workMin: 0, overtimeMin: 0 }
    const workHours = Math.round((att.workMin / 60) * 10) / 10
    const overtimeHours = Math.round((att.overtimeMin / 60) * 10) / 10

    let basicPay = 0
    let overtimePay = 0

    if (setting.pay_type === 'MONTHLY') {
      const monthly = setting.basic_monthly ?? 0
      const hourlyRate = monthly / (setting.standard_work_hours || 160)
      basicPay = monthly
      overtimePay = Math.round(hourlyRate * overtimeHours * setting.overtime_rate)
    } else {
      const hourly = setting.hourly_wage ?? 0
      const regularHours = Math.max(0, workHours - overtimeHours)
      basicPay = Math.round(hourly * regularHours)
      overtimePay = Math.round(hourly * overtimeHours * setting.overtime_rate)
    }

    const grossPay = basicPay + overtimePay + setting.transport_allowance

    await supabase.from('payrolls').upsert(
      {
        company_id: employee.company_id,
        emp_id: setting.emp_id,
        ym,
        basic_pay: basicPay,
        overtime_pay: overtimePay,
        transport_allowance: setting.transport_allowance,
        expense_reimbursement: 0,
        gross_pay: grossPay,
        work_hours: workHours,
        overtime_hours: overtimeHours,
        status: 'DRAFT',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,emp_id,ym' }
    )
  }

  return getPayrolls(ym)
}

// 給与のステータスを更新する
export async function updatePayrollStatus(id: string, status: 'CONFIRMED' | 'PAID') {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'CONFIRMED') updates.confirmed_at = new Date().toISOString()
  if (status === 'PAID') updates.paid_at = new Date().toISOString()

  const { error } = await supabase.from('payrolls').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
}

// 給与の経費精算額を手動設定して支給総額を再計算する
export async function updateExpenseReimbursement(id: string, amount: number) {
  const supabase = await createClient()

  const { data: payroll, error: fetchError } = await supabase
    .from('payrolls')
    .select('basic_pay, overtime_pay, transport_allowance')
    .eq('id', id)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const grossPay =
    payroll.basic_pay + payroll.overtime_pay + payroll.transport_allowance + amount

  const { error } = await supabase
    .from('payrolls')
    .update({
      expense_reimbursement: amount,
      gross_pay: grossPay,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
