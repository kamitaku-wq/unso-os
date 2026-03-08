// 月次締め処理のサーバー側ビジネスロジック
import { createClient } from '@/lib/supabase/server'

type ClosingSummary = {
  ym: string
  approvedSales: number
  approvedExpenses: number
  attendanceSummary: Record<string, { work_min: number; overtime_min: number }>
  warnings: {
    pendingBillables: number
    pendingExpenses: number
    pendingAttendances: number
  }
}

// 指定 ym が締め済みか確認する（billable/expense/attendance の登録前チェックに使用）
export async function isMonthClosed(ym: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('monthly_closings')
    .select('id')
    .eq('ym', ym)
    .maybeSingle()
  return !!data
}

// 締め済み月一覧を取得する
export async function getClosings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('monthly_closings')
    .select('id, ym, closed_at, closed_by, note')
    .order('ym', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

// 指定月の締め前サマリを集計する
export async function summarizeMonth(ym: string): Promise<ClosingSummary> {
  const supabase = await createClient()

  const [billablesRes, expensesRes, attendancesRes] = await Promise.all([
    supabase
      .from('billables')
      .select('amount, status')
      .eq('ym', ym.slice(0, 4) + '-' + ym.slice(4, 6))
      .neq('status', 'VOID'),
    supabase
      .from('expenses')
      .select('amount, status')
      .eq('ym', ym),
    supabase
      .from('attendances')
      .select('emp_id, work_min, overtime_min, status')
      .eq('ym', ym),
  ])

  const approvedSales = (billablesRes.data ?? [])
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

  const approvedExpenses = (expensesRes.data ?? [])
    .filter((r) => ['APPROVED', 'PAID'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

  const attendanceSummary: Record<string, { work_min: number; overtime_min: number }> = {}
  for (const r of (attendancesRes.data ?? []).filter((row) => row.status === 'APPROVED')) {
    if (!r.emp_id) continue
    if (!attendanceSummary[r.emp_id]) {
      attendanceSummary[r.emp_id] = { work_min: 0, overtime_min: 0 }
    }
    attendanceSummary[r.emp_id].work_min += r.work_min ?? 0
    attendanceSummary[r.emp_id].overtime_min += r.overtime_min ?? 0
  }

  const pendingBillables = (billablesRes.data ?? []).filter((r) => r.status === 'REVIEW_REQUIRED').length
  const pendingExpenses = (expensesRes.data ?? []).filter((r) => r.status === 'SUBMITTED').length
  const pendingAttendances = (attendancesRes.data ?? []).filter((r) => r.status === 'SUBMITTED').length

  return {
    ym,
    approvedSales,
    approvedExpenses,
    attendanceSummary,
    warnings: { pendingBillables, pendingExpenses, pendingAttendances },
  }
}

// 月次締めを実行する（サマリも返す）
export async function closeMonth(ym: string, closedBy: string, note?: string) {
  const supabase = await createClient()

  const already = await isMonthClosed(ym)
  if (already) throw new Error(`${ym} はすでに締め済みです`)

  const summary = await summarizeMonth(ym)

  const { data: myInfo } = await supabase
    .from('employees')
    .select('company_id')
    .limit(1)
    .single()

  if (!myInfo) throw new Error('社員情報が見つかりません')

  const { error } = await supabase.from('monthly_closings').insert({
    company_id: myInfo.company_id,
    ym,
    closed_by: closedBy,
    note: note ?? null,
  })
  if (error) throw new Error(error.message)

  return summary
}

// 月次締めを取り消す（OWNER のみ）
export async function reopenMonth(ym: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_closings')
    .delete()
    .eq('ym', ym)
  if (error) throw new Error(error.message)
}
