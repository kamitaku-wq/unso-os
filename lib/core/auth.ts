// 認証・ロール確認のヘルパー
import { createClient } from '@/lib/supabase/server'

export type Employee = {
  id: string
  emp_id: string
  company_id: string
  role: 'WORKER' | 'ADMIN' | 'OWNER'
  name: string
}

// ログインユーザーの社員情報を取得する
export async function getMyEmployee(): Promise<Employee> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data, error } = await supabase
    .from('employees')
    .select('id, emp_id, company_id, role, name')
    .eq('google_email', user.email!)
    .single()

  if (error || !data) throw new Error('社員情報が見つかりません')
  return data as Employee
}

// 指定ロールを持つユーザーのみ通過させる（権限がなければ例外を投げる）
export async function requireRole(allowedRoles: ('WORKER' | 'ADMIN' | 'OWNER')[]): Promise<Employee> {
  const employee = await getMyEmployee()
  if (!allowedRoles.includes(employee.role)) throw new Error('権限がありません')
  return employee
}
