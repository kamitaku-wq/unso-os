// 経営ダッシュボード用の集計ロジック
import { createClient } from '@/lib/supabase/server'

// 直近 N ヶ月分の ym リストを生成する（例: ['202601', '202602', '202603']）
function getRecentYmList(monthCount: number): string[] {
  const list: string[] = []
  const now = new Date()
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
    list.push(ym)
  }
  return list
}

// 承認待ち件数サマリを取得する
export async function getPendingCounts() {
  const supabase = await createClient()

  const [billables, expenses, attendances] = await Promise.all([
    supabase.from('billables').select('id', { count: 'exact', head: true }).eq('status', 'REVIEW_REQUIRED'),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    supabase.from('attendances').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
  ])

  return {
    billables: billables.count ?? 0,
    expenses: expenses.count ?? 0,
    attendances: attendances.count ?? 0,
  }
}

// 月別売上（承認済み運行実績）を集計する（直近6ヶ月）
export async function getMonthlySales() {
  const supabase = await createClient()
  const ymList = getRecentYmList(6)
  const ymFrom = ymList[0]
  const ymTo = ymList[ymList.length - 1]

  const { data, error } = await supabase
    .from('billables')
    .select('run_date, amount')
    .eq('status', 'APPROVED')
    .not('amount', 'is', null)
    .gte('run_date', `${ymFrom.slice(0, 4)}-${ymFrom.slice(4, 6)}-01`)
    .lte('run_date', `${ymTo.slice(0, 4)}-${ymTo.slice(4, 6)}-31`)

  if (error) throw new Error(error.message)

  // TypeScript 側で月別に集計
  const totals: Record<string, number> = Object.fromEntries(ymList.map(ym => [ym, 0]))
  for (const row of data ?? []) {
    const ym = row.run_date.slice(0, 7).replace('-', '')
    if (ym in totals) totals[ym] += Number(row.amount ?? 0)
  }

  return ymList.map(ym => ({ ym, amount: totals[ym] }))
}

// 月別経費（承認済み）を集計する（直近6ヶ月）
export async function getMonthlyExpenses() {
  const supabase = await createClient()
  const ymList = getRecentYmList(6)

  const { data, error } = await supabase
    .from('expenses')
    .select('ym, amount')
    .in('status', ['APPROVED', 'PAID'])
    .in('ym', ymList)

  if (error) throw new Error(error.message)

  const totals: Record<string, number> = Object.fromEntries(ymList.map(ym => [ym, 0]))
  for (const row of data ?? []) {
    if (row.ym && row.ym in totals) totals[row.ym] += Number(row.amount ?? 0)
  }

  return ymList.map(ym => ({ ym, amount: totals[ym] }))
}

// 当月の社員別運行実績件数・金額を集計する
export async function getCurrentMonthByEmployee() {
  const supabase = await createClient()
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthStart = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`
  const monthEnd = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-31`

  const { data, error } = await supabase
    .from('billables')
    .select('emp_id, amount, status')
    .gte('run_date', monthStart)
    .lte('run_date', monthEnd)
    .neq('status', 'VOID')

  if (error) throw new Error(error.message)

  // 社員ごとに集計
  const byEmp: Record<string, { count: number; amount: number }> = {}
  for (const row of data ?? []) {
    if (!byEmp[row.emp_id]) byEmp[row.emp_id] = { count: 0, amount: 0 }
    byEmp[row.emp_id].count += 1
    if (row.status === 'APPROVED') byEmp[row.emp_id].amount += Number(row.amount ?? 0)
  }

  return Object.entries(byEmp).map(([emp_id, stats]) => ({ emp_id, ...stats }))
}
