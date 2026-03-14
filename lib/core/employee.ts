// 社員管理のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  role: 'WORKER' | 'ADMIN' | 'OWNER'
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
  role?: 'WORKER' | 'ADMIN' | 'OWNER'
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

// 無効化済み社員を物理削除する（ADMIN/OWNER 用）
// 関連する todo_assignments・todos・push_subscriptions を先に削除
// push_subscriptions は RLS で自レコードのみ削除可のため、admin クライアントを使用
export async function deleteEmployee(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, emp_id, is_active, role, company_id')
    .eq('id', id)
    .single()
  if (empErr || !emp) throw new Error('社員が見つかりません')
  if (emp.is_active) throw new Error('無効化済みの社員のみ削除できます。先に無効化してください。')

  // 最後の OWNER は削除不可
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', emp.company_id)
    .eq('role', 'OWNER')
    .eq('is_active', true)
  if ((count ?? 0) <= 0) throw new Error('OWNER が1人もいない状態では削除できません')

  const admin = createAdminClient()
  // 関連データを削除（外部キー制約のため順序重要）
  await admin.from('todo_assignments').delete().eq('assignee_id', id)
  await admin.from('todos').delete().eq('creator_id', id)
  await admin.from('push_subscriptions').delete().eq('emp_id', id)
  const { error } = await admin.from('employees').delete().eq('id', id)
  if (error) throw new Error(error.message)
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

// 社員申請を削除する（REJECTED のみ・ADMIN/OWNER 用）
export async function deleteEmpRequest(requestId: string) {
  const supabase = await createClient()

  // REJECTED のみ削除可能
  const { data, error: fetchErr } = await supabase
    .from('emp_requests')
    .select('status')
    .eq('id', requestId)
    .single()
  if (fetchErr || !data) throw new Error('申請が見つかりません')
  if (data.status !== 'REJECTED') throw new Error('却下済みの申請のみ削除できます')

  const { error } = await supabase.from('emp_requests').delete().eq('id', requestId)
  if (error) throw new Error(error.message)
}

// 新規ユーザーが社員登録を申請する（ログイン済みなら誰でも可）
export async function submitEmpRequest(input: {
  name: string
  google_email: string
  role_requested: 'WORKER' | 'ADMIN' | 'OWNER'
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
