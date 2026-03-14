// シフト管理のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { requireRole, getMyEmployee } from '@/lib/core/auth'

export type ShiftInput = {
  emp_id: string
  shift_date: string
  is_day_off: boolean
  location: string | null
  work_type: string | null
  note: string | null
}

export type ShiftRow = {
  id: string
  emp_id: string
  shift_date: string
  is_day_off: boolean
  location: string | null
  work_type: string | null
  note: string | null
}

export type EmployeeForShift = {
  emp_id: string
  name: string
}

// シフト閲覧用の社員一覧を取得する
// WORKER: 自分だけ / ADMIN・OWNER: 全員
export async function getEmployeesForShift(): Promise<EmployeeForShift[]> {
  const me = await getMyEmployee()
  const supabase = await createClient()

  let query = supabase
    .from('employees')
    .select('emp_id, name')
    .eq('is_active', true)
    .order('emp_id')

  if (me.role === 'WORKER') {
    query = query.eq('emp_id', me.emp_id)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// 指定週のシフト一覧を取得する
// WORKER: 自分のシフトのみ / ADMIN・OWNER: 全員分
export async function getShifts(dateFrom: string, dateTo: string): Promise<ShiftRow[]> {
  const me = await getMyEmployee()
  const supabase = await createClient()

  let query = supabase
    .from('shifts')
    .select('id, emp_id, shift_date, is_day_off, location, work_type, note')
    .gte('shift_date', dateFrom)
    .lte('shift_date', dateTo)
    .order('shift_date')

  if (me.role === 'WORKER') {
    query = query.eq('emp_id', me.emp_id)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// シフトを登録・更新する（ADMIN/OWNER のみ）
export async function upsertShift(input: ShiftInput): Promise<void> {
  const employee = await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { data: emp } = await supabase
    .from('employees')
    .select('company_id')
    .eq('emp_id', input.emp_id)
    .single()
  if (!emp) throw new Error('社員が見つかりません')

  const { error } = await supabase.from('shifts').upsert(
    {
      company_id: emp.company_id,
      emp_id: input.emp_id,
      shift_date: input.shift_date,
      is_day_off: input.is_day_off,
      location: input.is_day_off ? null : input.location,
      work_type: input.is_day_off ? null : input.work_type,
      note: input.note,
      created_by: employee.emp_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,emp_id,shift_date' }
  )

  if (error) throw new Error(error.message)
}

// シフトを削除する（ADMIN/OWNER のみ）
export async function deleteShift(id: string): Promise<void> {
  await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { error } = await supabase.from('shifts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
