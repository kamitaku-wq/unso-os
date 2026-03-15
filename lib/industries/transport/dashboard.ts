// 経営ダッシュボード用の集計ロジック
import { createClient } from '@/lib/supabase/server'
import { getPrevMonthSameDayRange, ymToRange } from '@/lib/core/date-utils'

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

// 当月・前月の ym を返す
function getCurrentAndPrevYm() {
  const now = new Date()
  const thisYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevYm = `${prevDate.getFullYear()}${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  return { thisYm, prevYm }
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

// 月別売上を集計する（直近12ヶ月）
export async function getMonthlySales(includeAll = false) {
  const supabase = await createClient()
  const ymList = getRecentYmList(12)
  const ymFrom = ymList[0]
  const ymTo = ymList[ymList.length - 1]

  let query = supabase
    .from('billables')
    .select('run_date, amount')
    .not('amount', 'is', null)
    .gte('run_date', `${ymFrom.slice(0, 4)}-${ymFrom.slice(4, 6)}-01`)
    .lte('run_date', `${ymTo.slice(0, 4)}-${ymTo.slice(4, 6)}-31`)

  if (includeAll) {
    query = query.neq('status', 'VOID')
  } else {
    query = query.eq('status', 'APPROVED')
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const totals: Record<string, number> = Object.fromEntries(ymList.map(ym => [ym, 0]))
  for (const row of data ?? []) {
    const ym = row.run_date.slice(0, 7).replace('-', '')
    if (ym in totals) totals[ym] += Number(row.amount ?? 0)
  }

  return ymList.map(ym => ({ ym, amount: totals[ym] }))
}

// 月別経費を集計する（直近12ヶ月）
export async function getMonthlyExpenses(includeAll = false) {
  const supabase = await createClient()
  const ymList = getRecentYmList(12)

  const statuses = includeAll
    ? ['SUBMITTED', 'APPROVED', 'PAID']
    : ['APPROVED', 'PAID']

  const { data, error } = await supabase
    .from('expenses')
    .select('ym, amount')
    .in('status', statuses)
    .in('ym', ymList)

  if (error) throw new Error(error.message)

  const totals: Record<string, number> = Object.fromEntries(ymList.map(ym => [ym, 0]))
  for (const row of data ?? []) {
    if (row.ym && row.ym in totals) totals[row.ym] += Number(row.amount ?? 0)
  }

  return ymList.map(ym => ({ ym, amount: totals[ym] }))
}

// 当月の社員別運行実績件数・金額・名前を集計する
export async function getCurrentMonthByEmployee() {
  const supabase = await createClient()
  const { thisYm } = getCurrentAndPrevYm()
  const { start, end } = ymToRange(thisYm)

  const { data, error } = await supabase
    .from('billables')
    .select('emp_id, amount, status')
    .gte('run_date', start)
    .lte('run_date', end)
    .neq('status', 'VOID')

  if (error) throw new Error(error.message)

  const byEmp: Record<string, { count: number; amount: number }> = {}
  for (const row of data ?? []) {
    if (!byEmp[row.emp_id]) byEmp[row.emp_id] = { count: 0, amount: 0 }
    byEmp[row.emp_id].count += 1
    if (row.status === 'APPROVED') byEmp[row.emp_id].amount += Number(row.amount ?? 0)
  }

  const empIds = Object.keys(byEmp)
  if (empIds.length === 0) return []

  const { data: employees } = await supabase
    .from('employees')
    .select('emp_id, name')
    .in('emp_id', empIds)

  const nameMap: Record<string, string> = {}
  for (const emp of employees ?? []) {
    nameMap[emp.emp_id] = emp.name
  }

  return Object.entries(byEmp).map(([emp_id, stats]) => ({
    emp_id,
    name: nameMap[emp_id] ?? emp_id,
    ...stats,
  }))
}

// 当月・前月の KPI を比較する（売上・経費・利益）
export async function getMonthlyKpi(includeAll = false) {
  const supabase = await createClient()
  const { thisYm, prevYm } = getCurrentAndPrevYm()
  const thisRange = ymToRange(thisYm)
  const prevRange = getPrevMonthSameDayRange(prevYm)

  const billableStatuses = includeAll ? ['REVIEW_REQUIRED', 'APPROVED'] : ['APPROVED']
  const expenseStatuses = includeAll ? ['SUBMITTED', 'APPROVED', 'PAID'] : ['APPROVED', 'PAID']

  const [thisBillables, prevBillables, thisExpenses, prevExpenses] = await Promise.all([
    supabase.from('billables').select('amount').in('status', billableStatuses)
      .gte('run_date', thisRange.start).lte('run_date', thisRange.end),
    supabase.from('billables').select('amount').in('status', billableStatuses)
      .gte('run_date', prevRange.start).lte('run_date', prevRange.end),
    supabase.from('expenses').select('amount').in('status', expenseStatuses).eq('ym', thisYm),
    supabase.from('expenses').select('amount').in('status', expenseStatuses).eq('ym', prevYm),
  ])

  const thisSales = (thisBillables.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const prevSales = (prevBillables.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const thisExp = (thisExpenses.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const prevExp = (prevExpenses.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)

  const thisProfit = thisSales - thisExp
  const prevProfit = prevSales - prevExp
  const profitRate = thisSales > 0 ? Math.round((thisProfit / thisSales) * 1000) / 10 : 0

  const pctChange = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null

  return {
    sales: { current: thisSales, prev: prevSales, change: pctChange(thisSales, prevSales) },
    expenses: { current: thisExp, prev: prevExp, change: pctChange(thisExp, prevExp) },
    profit: { current: thisProfit, prev: prevProfit, change: pctChange(thisProfit, Math.abs(prevProfit)), rate: profitRate },
  }
}

// 承認済みで未請求の運行実績を集計する
export async function getUnbilledAmount() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('billables')
    .select('amount')
    .eq('status', 'APPROVED')
    .is('invoice_id', null)
    .not('amount', 'is', null)

  if (error) throw new Error(error.message)

  const amount = (data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  return { amount, count: data?.length ?? 0 }
}

// 当月の経費を区分別に集計する（上位5件）
export async function getExpenseCategoryBreakdown(includeAll = false) {
  const supabase = await createClient()
  const { thisYm } = getCurrentAndPrevYm()

  const statuses = includeAll
    ? ['SUBMITTED', 'APPROVED', 'PAID']
    : ['APPROVED', 'PAID']

  const { data, error } = await supabase
    .from('expenses')
    .select('category_name, amount')
    .in('status', statuses)
    .eq('ym', thisYm)

  if (error) throw new Error(error.message)

  const byCategory: Record<string, number> = {}
  for (const row of data ?? []) {
    const name = row.category_name ?? '不明'
    byCategory[name] = (byCategory[name] ?? 0) + Number(row.amount ?? 0)
  }

  return Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
}

// 当月の勤怠サマリーを集計する（承認済みのみ）
export async function getAttendanceSummary() {
  const supabase = await createClient()
  const { thisYm } = getCurrentAndPrevYm()
  const { start, end } = ymToRange(thisYm)

  const { data, error } = await supabase
    .from('attendances')
    .select('work_min, overtime_min, emp_id')
    .eq('status', 'APPROVED')
    .gte('work_date', start)
    .lte('work_date', end)

  if (error) throw new Error(error.message)

  const totalWorkMin = (data ?? []).reduce((s, r) => s + Number(r.work_min ?? 0), 0)
  const totalOvertimeMin = (data ?? []).reduce((s, r) => s + Number(r.overtime_min ?? 0), 0)
  const activeEmployees = new Set((data ?? []).map(r => r.emp_id)).size

  return {
    totalWorkHours: Math.round((totalWorkMin / 60) * 10) / 10,
    totalOvertimeHours: Math.round((totalOvertimeMin / 60) * 10) / 10,
    activeEmployees,
    approvedCount: data?.length ?? 0,
  }
}
