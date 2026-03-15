// 清掃業務ダッシュボード集計ロジック
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { getPrevMonthSameDayRange, ymToRange } from '@/lib/core/date-utils'

// 直近 N ヶ月分の ym リストを生成する
function getRecentYmList(n: number): string[] {
  const list: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return list
}

// 当月・前月の ym を返す
function getCurrentAndPrevYm() {
  const now = new Date()
  const thisYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevYm = `${prev.getFullYear()}${String(prev.getMonth() + 1).padStart(2, '0')}`
  return { thisYm, prevYm }
}

// Supabase の 1000 行制限を回避して全行を取得するヘルパー
// buildQuery: supabase クライアントを受け取り、range なしのクエリを返す関数
async function fetchAll<T>(
  buildQuery: (sb: SupabaseClient) => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }
): Promise<T[]> {
  const supabase = await createClient()
  const PAGE = 1000
  let all: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await buildQuery(supabase).range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all = all.concat(rows)
    if (rows.length < PAGE) break
    from += PAGE
  }
  return all
}

// 承認待ち件数
export async function getPendingCounts() {
  const supabase = await createClient()
  const [jobs, expenses] = await Promise.all([
    supabase.from('cleaning_jobs').select('id', { count: 'exact', head: true }).eq('status', 'REVIEW_REQUIRED'),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
  ])
  return { cleaningJobs: jobs.count ?? 0, expenses: expenses.count ?? 0 }
}

// 当月 KPI（売上・経費・利益・件数・承認率・レビュー件数・平均承認リードタイム）
export async function getMonthlyKpi(includeAll = false) {
  const supabase = await createClient()
  const { thisYm, prevYm } = getCurrentAndPrevYm()
  const thisRange = ymToRange(thisYm)
  const prevRange = getPrevMonthSameDayRange(prevYm)

  const jobStatuses = includeAll ? ['REVIEW_REQUIRED', 'APPROVED'] : ['APPROVED']
  const expStatuses = includeAll ? ['SUBMITTED', 'APPROVED', 'PAID'] : ['APPROVED', 'PAID']

  type JobRow = { amount: number; status: string; created_at: string; approved_at: string | null }
  type AmtRow = { amount: number }

  const [thisJobData, prevJobData, thisExpData, prevExpData, reviewJobs] = await Promise.all([
    fetchAll<JobRow>(sb => sb.from('cleaning_jobs').select('amount, status, created_at, approved_at')
      .in('status', jobStatuses).gte('work_date', thisRange.start).lte('work_date', thisRange.end)),
    fetchAll<AmtRow>(sb => sb.from('cleaning_jobs').select('amount')
      .in('status', jobStatuses).gte('work_date', prevRange.start).lte('work_date', prevRange.end)),
    fetchAll<AmtRow>(sb => sb.from('expenses').select('amount').in('status', expStatuses).eq('ym', thisYm)),
    fetchAll<AmtRow>(sb => sb.from('expenses').select('amount').in('status', expStatuses).eq('ym', prevYm)),
    supabase.from('cleaning_jobs').select('id', { count: 'exact', head: true })
      .eq('status', 'REVIEW_REQUIRED'),
  ])

  const sum = (rows: { amount: unknown }[]) => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const thisSales = sum(thisJobData)
  const prevSales = sum(prevJobData)
  const thisExpAmt = sum(thisExpData)
  const prevExpAmt = sum(prevExpData)
  const thisProfit = thisSales - thisExpAmt
  const prevProfit = prevSales - prevExpAmt
  const profitRate = thisSales > 0 ? Math.round((thisProfit / thisSales) * 1000) / 10 : 0
  const pct = (c: number, p: number) => p > 0 ? Math.round(((c - p) / p) * 100) : null

  const jobCount = thisJobData.length
  const approvedCount = thisJobData.filter(j => j.status === 'APPROVED').length
  const approvalRate = jobCount > 0 ? Math.round((approvedCount / jobCount) * 1000) / 10 : 0

  const leadTimes = thisJobData
    .filter(j => j.approved_at && j.created_at)
    .map(j => (new Date(j.approved_at as string).getTime() - new Date(j.created_at as string).getTime()) / 3600000)
  const avgLeadTime = leadTimes.length > 0 ? Math.round(leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length * 10) / 10 : 0

  return {
    sales: { current: thisSales, prev: prevSales, change: pct(thisSales, prevSales) },
    expenses: { current: thisExpAmt, prev: prevExpAmt, change: pct(thisExpAmt, prevExpAmt) },
    profit: { current: thisProfit, prev: prevProfit, change: pct(thisProfit, Math.abs(prevProfit)), rate: profitRate },
    jobCount,
    approvalRate,
    reviewCount: reviewJobs.count ?? 0,
    avgLeadTimeHours: avgLeadTime,
  }
}

// 未請求残高
export async function getUnbilledAmount() {
  type AmtRow = { amount: number }
  const data = await fetchAll<AmtRow>(sb => sb.from('cleaning_jobs').select('amount')
    .eq('status', 'APPROVED').is('invoice_id', null).not('amount', 'is', null))
  const amount = data.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  return { amount, count: data.length }
}

// 月別売上（直近6ヶ月）
export async function getMonthlySales(includeAll = false) {
  const ymList = getRecentYmList(12)
  const statuses = includeAll ? ['REVIEW_REQUIRED', 'APPROVED'] : ['APPROVED']
  type Row = { ym: string; amount: number }
  const data = await fetchAll<Row>(sb => sb.from('cleaning_jobs').select('ym, amount')
    .in('status', statuses).in('ym', ymList))
  const totals: Record<string, number> = Object.fromEntries(ymList.map(ym => [ym, 0]))
  for (const r of data) { if (r.ym && r.ym in totals) totals[r.ym] += Number(r.amount ?? 0) }
  return ymList.map(ym => ({ ym, amount: totals[ym] }))
}

// 月別経費（直近6ヶ月）
export async function getMonthlyExpenses(includeAll = false) {
  const ymList = getRecentYmList(12)
  const statuses = includeAll ? ['SUBMITTED', 'APPROVED', 'PAID'] : ['APPROVED', 'PAID']
  type Row = { ym: string; amount: number }
  const data = await fetchAll<Row>(sb => sb.from('expenses').select('ym, amount')
    .in('status', statuses).in('ym', ymList))
  const totals: Record<string, number> = Object.fromEntries(ymList.map(ym => [ym, 0]))
  for (const r of data) { if (r.ym && r.ym in totals) totals[r.ym] += Number(r.amount ?? 0) }
  return ymList.map(ym => ({ ym, amount: totals[ym] }))
}

// 月別件数（棒グラフ用、売上と重ねて表示）
export async function getMonthlyJobCounts(includeAll = false) {
  const ymList = getRecentYmList(12)
  const statuses = includeAll ? ['REVIEW_REQUIRED', 'APPROVED'] : ['APPROVED']
  type Row = { ym: string }
  const data = await fetchAll<Row>(sb => sb.from('cleaning_jobs').select('ym')
    .in('status', statuses).in('ym', ymList))
  const counts: Record<string, number> = Object.fromEntries(ymList.map(ym => [ym, 0]))
  for (const r of data) { if (r.ym && r.ym in counts) counts[r.ym] += 1 }
  return ymList.map(ym => ({ ym, count: counts[ym] }))
}

// 店舗別売上（上位10件）
export async function getStoreBreakdown(includeAll = false) {
  const { thisYm } = getCurrentAndPrevYm()
  const { start, end } = ymToRange(thisYm)
  const statuses = includeAll ? ['REVIEW_REQUIRED', 'APPROVED'] : ['APPROVED']
  type Row = { store_name: string; amount: number }
  const data = await fetchAll<Row>(sb => sb.from('cleaning_jobs').select('store_name, amount')
    .in('status', statuses).gte('work_date', start).lte('work_date', end))
  const byStore: Record<string, number> = {}
  for (const r of data) { byStore[r.store_name ?? '不明'] = (byStore[r.store_name ?? '不明'] ?? 0) + Number(r.amount ?? 0) }
  return Object.entries(byStore).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 10)
}

// 作業種別別売上（上位10件）
export async function getWorkTypeBreakdown(includeAll = false) {
  const { thisYm } = getCurrentAndPrevYm()
  const { start, end } = ymToRange(thisYm)
  const statuses = includeAll ? ['REVIEW_REQUIRED', 'APPROVED'] : ['APPROVED']
  type Row = { work_name: string; amount: number }
  const data = await fetchAll<Row>(sb => sb.from('cleaning_jobs').select('work_name, amount')
    .in('status', statuses).gte('work_date', start).lte('work_date', end))
  const byWork: Record<string, number> = {}
  for (const r of data) { byWork[r.work_name ?? '不明'] = (byWork[r.work_name ?? '不明'] ?? 0) + Number(r.amount ?? 0) }
  return Object.entries(byWork).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 10)
}

// 経費区分別内訳
export async function getExpenseCategoryBreakdown(includeAll = false) {
  const { thisYm } = getCurrentAndPrevYm()
  const statuses = includeAll ? ['SUBMITTED', 'APPROVED', 'PAID'] : ['APPROVED', 'PAID']
  type Row = { category_name: string; amount: number }
  const data = await fetchAll<Row>(sb => sb.from('expenses').select('category_name, amount')
    .in('status', statuses).eq('ym', thisYm))
  const byCategory: Record<string, number> = {}
  for (const r of data) { byCategory[r.category_name ?? '不明'] = (byCategory[r.category_name ?? '不明'] ?? 0) + Number(r.amount ?? 0) }
  return Object.entries(byCategory).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5)
}

// スタッフ稼働分析テーブル（承認率計算のため常にREVIEW_REQUIREDも含む）
export async function getStaffAnalysis() {
  const supabase = await createClient()
  const { thisYm } = getCurrentAndPrevYm()
  const { start, end } = ymToRange(thisYm)

  type Row = { emp_id: string; amount: number; status: string; created_at: string; approved_at: string | null }
  const data = await fetchAll<Row>(sb => sb.from('cleaning_jobs')
    .select('emp_id, amount, status, created_at, approved_at')
    .in('status', ['REVIEW_REQUIRED', 'APPROVED']).gte('work_date', start).lte('work_date', end))

  const byEmp: Record<string, { total: number; approved: number; amount: number; leadTimes: number[] }> = {}
  for (const r of data) {
    if (!byEmp[r.emp_id]) byEmp[r.emp_id] = { total: 0, approved: 0, amount: 0, leadTimes: [] }
    byEmp[r.emp_id].total += 1
    if (r.status === 'APPROVED') {
      byEmp[r.emp_id].approved += 1
      byEmp[r.emp_id].amount += Number(r.amount ?? 0)
      if (r.approved_at && r.created_at) {
        byEmp[r.emp_id].leadTimes.push(
          (new Date(r.approved_at).getTime() - new Date(r.created_at).getTime()) / 3600000
        )
      }
    }
  }

  const empIds = Object.keys(byEmp)
  if (empIds.length === 0) return []
  const { data: employees } = await supabase.from('employees').select('emp_id, name').in('emp_id', empIds)
  const nameMap: Record<string, string> = {}
  for (const e of employees ?? []) nameMap[e.emp_id] = e.name

  return Object.entries(byEmp)
    .map(([emp_id, s]) => ({
      emp_id,
      name: nameMap[emp_id] ?? emp_id,
      totalJobs: s.total,
      approvedJobs: s.approved,
      approvalRate: s.total > 0 ? Math.round((s.approved / s.total) * 1000) / 10 : 0,
      amount: s.amount,
      avgLeadTimeHours: s.leadTimes.length > 0
        ? Math.round(s.leadTimes.reduce((a, b) => a + b, 0) / s.leadTimes.length * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// 勤怠サマリー
export async function getAttendanceSummary() {
  const { thisYm } = getCurrentAndPrevYm()
  const { start, end } = ymToRange(thisYm)
  type Row = { work_min: number; overtime_min: number; emp_id: string }
  const data = await fetchAll<Row>(sb => sb.from('attendances').select('work_min, overtime_min, emp_id')
    .eq('status', 'APPROVED').gte('work_date', start).lte('work_date', end))
  const totalWorkMin = data.reduce((s, r) => s + Number(r.work_min ?? 0), 0)
  const totalOvertimeMin = data.reduce((s, r) => s + Number(r.overtime_min ?? 0), 0)
  const activeEmployees = new Set(data.map(r => r.emp_id)).size
  return {
    totalWorkHours: Math.round((totalWorkMin / 60) * 10) / 10,
    totalOvertimeHours: Math.round((totalOvertimeMin / 60) * 10) / 10,
    activeEmployees,
    approvedCount: data.length,
  }
}
