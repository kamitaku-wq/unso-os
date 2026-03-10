// 運行実績（billable）のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { getMyEmployee } from '@/lib/core/auth'
import { isMonthClosed } from '@/lib/core/closing'

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
  const me = await getMyEmployee()

  if (data.run_date) {
    const ym = data.run_date.slice(0, 7).replace('-', '')
    if (await isMonthClosed(ym)) throw new Error(`${ym} は月次締め済みのため入力できません`)
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const billable_id = `B-${date}-${rand}`

  const { error } = await supabase.from('billables').insert({
    company_id: me.company_id,
    billable_id,
    emp_id: me.emp_id,
    status: 'REVIEW_REQUIRED',
    ...data,
  })

  if (error) throw new Error(error.message)
  return { billable_id }
}

// 会社全体の運行実績一覧を取得する（ADMIN/OWNER 用）
export async function getAllBillables(status?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('billables')
    .select('id, billable_id, run_date, emp_id, cust_id, route_id, pickup_loc, drop_loc, status, amount, note, depart_at, arrive_at, vehicle_id, distance_km, timestamp, approved_at, approved_by, void_at, void_by')
    .order('run_date', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// 運行実績を承認する（金額も同時に設定。REVIEW_REQUIRED のみ承認可）
export async function approveBillable(id: string, amount: number, approvedBy: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billables')
    .update({
      status: 'APPROVED',
      amount,
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq('id', id)
    .eq('status', 'REVIEW_REQUIRED')
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('この実績はすでに処理済みです')
}

// 運行実績を無効化（VOID）する（APPROVED のみ無効化可）
export async function voidBillable(id: string, voidBy: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billables')
    .update({
      status: 'VOID',
      void_at: new Date().toISOString(),
      void_by: voidBy,
    })
    .eq('id', id)
    .in('status', ['REVIEW_REQUIRED', 'APPROVED'])
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('この実績はすでに無効化済みです')
}

// 運行実績を削除する（VOID 済みのみ・ADMIN/OWNER 用）
export async function deleteBillable(id: string) {
  const supabase = await createClient()

  const { data, error: fetchErr } = await supabase
    .from('billables')
    .select('status')
    .eq('id', id)
    .single()
  if (fetchErr || !data) throw new Error('実績が見つかりません')
  if (data.status !== 'VOID') throw new Error('無効化済みの実績のみ削除できます')

  const { error } = await supabase.from('billables').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ログインユーザー自身の運行実績一覧を取得する
export async function getMyBillables() {
  const supabase = await createClient()
  const me = await getMyEmployee()

  const { data, error } = await supabase
    .from('billables')
    .select('billable_id, run_date, cust_id, route_id, pickup_loc, drop_loc, status, amount, note, depart_at, arrive_at, vehicle_id, distance_km, timestamp')
    .eq('emp_id', me.emp_id)
    .order('run_date', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data ?? []
}
