// 勤怠のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { isMonthClosed } from '@/lib/core/closing'

type AttendanceInput = {
  work_date: string
  clock_in: string
  clock_out: string
  break_min: number
  drive_min: number | null
  note: string | null
}

// 出勤時間・残業時間を計算する（分単位）
function calcWorkMinutes(clockIn: string, clockOut: string, breakMin: number) {
  const inMs = new Date(clockIn).getTime()
  const outMs = new Date(clockOut).getTime()
  const totalMin = Math.round((outMs - inMs) / 60000)
  const workMin = Math.max(0, totalMin - breakMin)
  const overtimeMin = Math.max(0, workMin - 480) // 8時間（480分）超を残業とする
  return { workMin, overtimeMin }
}

// 勤怠を新規申請する
export async function createAttendance(data: AttendanceInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('emp_id, company_id')
    .eq('google_email', user.email!)
    .single()

  if (empError || !employee) throw new Error('社員情報が見つかりません')

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const attendance_id = `A-${date}-${rand}`

  const ym = data.work_date.slice(0, 7).replace('-', '')

  if (await isMonthClosed(ym)) throw new Error(`${ym} は月次締め済みのため申請できません`)

  const { workMin, overtimeMin } = calcWorkMinutes(data.clock_in, data.clock_out, data.break_min)

  const { error } = await supabase.from('attendances').insert({
    company_id: employee.company_id,
    attendance_id,
    emp_id: employee.emp_id,
    status: 'SUBMITTED',
    ym,
    work_min: workMin,
    overtime_min: overtimeMin,
    ...data,
  })

  if (error) throw new Error(error.message)
  return { attendance_id }
}

// ログインユーザー自身の勤怠一覧を取得する
export async function getMyAttendances() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('emp_id')
    .eq('google_email', user.email!)
    .single()

  if (!employee) throw new Error('社員情報が見つかりません')

  const { data, error } = await supabase
    .from('attendances')
    .select('id, attendance_id, work_date, ym, clock_in, clock_out, break_min, work_min, drive_min, overtime_min, status, note, approved_at, reject_reason, created_at')
    .eq('emp_id', employee.emp_id)
    .order('work_date', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data ?? []
}

// 会社全体の勤怠一覧を取得する（ADMIN/OWNER 用）
export async function getAllAttendances(status?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('attendances')
    .select('id, attendance_id, emp_id, work_date, ym, clock_in, clock_out, break_min, work_min, drive_min, overtime_min, status, note, approved_at, approved_by, reject_reason, created_at')
    .order('work_date', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// 勤怠を承認する
export async function approveAttendance(id: string, approvedBy: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendances')
    .update({ status: 'APPROVED', approved_at: new Date().toISOString(), approved_by: approvedBy })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// 勤怠を却下する
export async function rejectAttendance(id: string, reason: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendances')
    .update({ status: 'REJECTED', reject_reason: reason })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
