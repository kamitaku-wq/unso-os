// シフトルーティン（曜日別テンプレート）のビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/core/auth'

export type RoutineRow = {
  id: string
  emp_id: string
  day_of_week: number // 0=月 ... 6=日
  is_day_off: boolean
  location: string | null
  work_type: string | null
  note: string | null
}

export type RoutineInput = {
  emp_id: string
  routines: {
    day_of_week: number
    is_day_off: boolean
    location: string | null
    work_type: string | null
    note: string | null
  }[]
}

// 指定従業員のルーティンを取得する
export async function getRoutines(empId: string): Promise<RoutineRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shift_routines')
    .select('id, emp_id, day_of_week, is_day_off, location, work_type, note')
    .eq('emp_id', empId)
    .order('day_of_week')
  if (error) throw new Error(error.message)
  return data ?? []
}

// 全従業員のルーティンを一括取得する
export async function getAllRoutines(): Promise<RoutineRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shift_routines')
    .select('id, emp_id, day_of_week, is_day_off, location, work_type, note')
    .order('emp_id')
    .order('day_of_week')
  if (error) throw new Error(error.message)
  return data ?? []
}

// ルーティンを保存する（ADMIN/OWNER のみ。7曜日分まとめてupsert）
export async function saveRoutines(input: RoutineInput): Promise<void> {
  const employee = await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { data: emp } = await supabase
    .from('employees')
    .select('company_id')
    .eq('emp_id', input.emp_id)
    .single()
  if (!emp) throw new Error('社員が見つかりません')

  // 既存ルーティンを削除してから再挿入（7件以下なので問題ない）
  await supabase
    .from('shift_routines')
    .delete()
    .eq('emp_id', input.emp_id)
    .eq('company_id', emp.company_id)

  const rows = input.routines
    .filter(r => r.is_day_off || r.location || r.work_type)
    .map(r => ({
      company_id: emp.company_id,
      emp_id: input.emp_id,
      day_of_week: r.day_of_week,
      is_day_off: r.is_day_off,
      location: r.is_day_off ? null : r.location,
      work_type: r.is_day_off ? null : r.work_type,
      note: r.note,
    }))

  if (rows.length > 0) {
    const { error } = await supabase.from('shift_routines').insert(rows)
    if (error) throw new Error(error.message)
  }
}

// ルーティンから指定週のシフトを自動生成する（既存シフトは上書きしない）
export async function applyRoutinesToWeek(mondayStr: string): Promise<number> {
  const employee = await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  // 全ルーティンを取得
  const { data: routines } = await supabase
    .from('shift_routines')
    .select('emp_id, day_of_week, is_day_off, location, work_type, note, company_id')
  if (!routines || routines.length === 0) return 0

  // 週の7日分の日付
  const monday = new Date(mondayStr + 'T00:00:00')
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  // 既存シフトを取得（上書きしないため）
  const sunday = dates[6]
  const { data: existingShifts } = await supabase
    .from('shifts')
    .select('emp_id, shift_date')
    .gte('shift_date', mondayStr)
    .lte('shift_date', sunday)
  const existingKeys = new Set((existingShifts ?? []).map(s => `${s.emp_id}_${s.shift_date}`))

  // ルーティンからシフトを生成（既存がないもののみ）
  const inserts = routines
    .map(r => ({
      company_id: r.company_id,
      emp_id: r.emp_id,
      shift_date: dates[r.day_of_week],
      is_day_off: r.is_day_off,
      location: r.is_day_off ? null : r.location,
      work_type: r.is_day_off ? null : r.work_type,
      note: r.note,
      created_by: employee.emp_id,
      updated_at: new Date().toISOString(),
    }))
    .filter(s => !existingKeys.has(`${s.emp_id}_${s.shift_date}`))

  if (inserts.length === 0) return 0

  const { error } = await supabase.from('shifts').insert(inserts)
  if (error) throw new Error(error.message)
  return inserts.length
}
