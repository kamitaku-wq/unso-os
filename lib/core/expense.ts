// 経費申請のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { isMonthClosed } from '@/lib/core/closing'

type ExpenseInput = {
  expense_date: string
  category_id: string
  category_name: string
  amount: number
  vendor: string | null
  description: string | null
}

// 経費を新規申請する
export async function createExpense(data: ExpenseInput) {
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
  const expense_id = `E-${date}-${rand}`

  const ym = data.expense_date.slice(0, 7).replace('-', '')

  if (await isMonthClosed(ym)) throw new Error(`${ym} は月次締め済みのため申請できません`)

  const { data: insertedExpense, error } = await supabase
    .from('expenses')
    .insert({
      company_id: employee.company_id,
      expense_id,
      emp_id: employee.emp_id,
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      ym,
      ...data,
    })
    .select('id, expense_id')
    .single()

  if (error || !insertedExpense) throw new Error(error?.message ?? '経費申請の保存に失敗しました')
  return insertedExpense
}

// ログインユーザー自身の経費一覧を取得する
export async function getMyExpenses() {
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
    .from('expenses')
    .select('id, expense_id, expense_date, category_id, category_name, amount, vendor, description, receipt_url, status, submitted_at, approved_at, rejected_at, reject_reason, rework_reason')
    .eq('emp_id', employee.emp_id)
    .order('expense_date', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data ?? []
}

// 会社全体の経費一覧を取得する（ADMIN/OWNER 用）
export async function getAllExpenses(status?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select('id, expense_id, emp_id, expense_date, ym, category_name, amount, vendor, description, status, submitted_at, approved_at, approved_by, rejected_at, rejected_by, reject_reason, rework_reason, paid_at')
    .order('expense_date', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// 経費を承認する
export async function approveExpense(id: string, approvedBy: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ status: 'APPROVED', approved_at: new Date().toISOString(), approved_by: approvedBy })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// 経費を却下する
export async function rejectExpense(id: string, rejectedBy: string, reason: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ status: 'REJECTED', rejected_at: new Date().toISOString(), rejected_by: rejectedBy, reject_reason: reason })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// 経費を差し戻す
export async function reworkExpense(id: string, reason: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ status: 'REWORK_REQUIRED', rework_at: new Date().toISOString(), rework_reason: reason })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// 経費を支払済みにする
export async function payExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ status: 'PAID', paid_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
