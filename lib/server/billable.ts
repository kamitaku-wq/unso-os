// 運行実績（billable）のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'

type BillableInput = {
  run_date: string
  cust_id: string | null
  route_id: string | null
  pickup_loc: string | null
  drop_loc: string | null
  depart_at: string | null
  arrive_at: string | null
  vehicle_id: string | null
  distance_km: number | null
  note: string | null
}

// 運行実績を新規登録する
export async function createBillable(data: BillableInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('emp_id, company_id')
    .eq('google_email', user.email!)
    .single()

  if (empError || !employee) throw new Error('社員情報が見つかりません')

  // billable_id を生成（例: B-20260307-AB12）
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const billable_id = `B-${date}-${rand}`

  const { error } = await supabase.from('billables').insert({
    company_id: employee.company_id,
    billable_id,
    emp_id: employee.emp_id,
    status: 'REVIEW_REQUIRED',
    ...data,
  })

  if (error) throw new Error(error.message)
  return { billable_id }
}

// ログインユーザー自身の運行実績一覧を取得する
export async function getMyBillables() {
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
    .from('billables')
    .select('billable_id, run_date, cust_id, route_id, pickup_loc, drop_loc, status, amount, note, depart_at, arrive_at, vehicle_id, distance_km, timestamp')
    .eq('emp_id', employee.emp_id)
    .order('run_date', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data ?? []
}
