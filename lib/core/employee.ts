// 社員管理のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'

// 社員一覧を取得する（ADMIN/OWNER 用）
export async function getEmployees() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, emp_id, name, google_email, role, is_active, created_at')
    .order('emp_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

// 社員を直接追加する（ADMIN/OWNER 用）
export async function createEmployee(input: {
  name: string
  google_email: string
  role: 'DRIVER' | 'ADMIN' | 'OWNER'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: me } = await supabase
    .from('employees')
    .select('company_id')
    .eq('google_email', user.email!)
    .single()
  if (!me) throw new Error('社員情報が見つかりません')

  // 既存の社員数から emp_id を採番する（例: EMP002）
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', me.company_id)
  const empNum = String((count ?? 0) + 1).padStart(3, '0')
  const emp_id = `EMP${empNum}`

  const { error } = await supabase.from('employees').insert({
    company_id: me.company_id,
    emp_id,
    is_active: true,
    ...input,
  })
  if (error) throw new Error(error.message)
  return { emp_id }
}

// 社員のロール・在籍状態を更新する（ADMIN/OWNER 用）
export async function updateEmployee(id: string, input: {
  role?: 'DRIVER' | 'ADMIN' | 'OWNER'
  is_active?: boolean
  name?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('employees')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// 社員申請一覧を取得する（ADMIN/OWNER 用）
export async function getEmpRequests(status?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('emp_requests')
    .select('id, request_id, google_email, name, role_requested, status, submitted_at, decided_at, decided_by, note')
    .order('submitted_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// 社員申請を承認して社員を登録する
export async function approveEmpRequest(requestId: string, decidedBy: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  // 申請情報を取得
  const { data: req, error: reqErr } = await supabase
    .from('emp_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (reqErr || !req) throw new Error('申請が見つかりません')

  const { data: me } = await supabase
    .from('employees')
    .select('company_id')
    .eq('google_email', user.email!)
    .single()
  if (!me) throw new Error('社員情報が見つかりません')

  // emp_id を採番
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', me.company_id)
  const empNum = String((count ?? 0) + 1).padStart(3, '0')
  const emp_id = `EMP${empNum}`

  // 社員を登録
  const { error: empErr } = await supabase.from('employees').insert({
    company_id: me.company_id,
    emp_id,
    name: req.name,
    google_email: req.google_email,
    role: req.role_requested,
    is_active: true,
  })
  if (empErr) throw new Error(empErr.message)

  // 申請ステータスを更新
  const { error: updErr } = await supabase
    .from('emp_requests')
    .update({ status: 'APPROVED', decided_at: new Date().toISOString(), decided_by: decidedBy })
    .eq('id', requestId)
  if (updErr) throw new Error(updErr.message)

  return { emp_id }
}

// 社員申請を却下する
export async function rejectEmpRequest(requestId: string, decidedBy: string, note?: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('emp_requests')
    .update({ status: 'REJECTED', decided_at: new Date().toISOString(), decided_by: decidedBy, note: note ?? null })
    .eq('id', requestId)
  if (error) throw new Error(error.message)
}

// 新規ユーザーが社員登録を申請する（ログイン済みなら誰でも可）
export async function submitEmpRequest(input: {
  name: string
  google_email: string
  role_requested: 'DRIVER' | 'ADMIN' | 'OWNER'
  company_id: string
}) {
  const supabase = await createClient()

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const request_id = `REQ-${date}-${rand}`

  const { error } = await supabase.from('emp_requests').insert({
    request_id,
    status: 'PENDING',
    submitted_at: new Date().toISOString(),
    ...input,
  })
  if (error) throw new Error(error.message)
  return { request_id }
}
