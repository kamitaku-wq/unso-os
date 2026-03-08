// CSV エクスポートのサーバー側ロジック
import { createClient } from '@/lib/supabase/server'

// 配列データを CSV 文字列に変換する
function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.join(','), ...rows.map(r => r.map(escape).join(','))]
  // BOM 付き UTF-8（Excel で文字化けしないように）
  return '\uFEFF' + lines.join('\r\n')
}

// emp_id → 氏名のマップを取得する
async function getEmpNameMap(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('employees').select('emp_id, name')
  const map: Record<string, string> = {}
  for (const e of data ?? []) {
    if (e.emp_id) map[e.emp_id] = e.name
  }
  return map
}

// 運行実績を CSV 用データとして取得する
export async function exportBillables(periodFrom?: string, periodTo?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('billables')
    .select('billable_id, run_date, emp_id, cust_id, route_id, pickup_loc, drop_loc, depart_at, arrive_at, distance_km, amount, status, invoice_id, note')
    .neq('status', 'VOID')
    .order('run_date')

  if (periodFrom) query = query.gte('run_date', periodFrom)
  if (periodTo)   query = query.lte('run_date', periodTo)

  const [{ data, error }, nameMap] = await Promise.all([query, getEmpNameMap()])
  if (error) throw new Error(error.message)

  const headers = ['実績ID', '運行日', '社員ID', '氏名', '荷主コード', 'ルートコード', '積み地', '降ろし地', '出発時刻', '到着時刻', '距離(km)', '金額', 'ステータス', '請求書番号', '備考']
  const rows = (data ?? []).map(r => [
    r.billable_id, r.run_date, r.emp_id, nameMap[r.emp_id] ?? '',
    r.cust_id, r.route_id, r.pickup_loc, r.drop_loc,
    r.depart_at, r.arrive_at, r.distance_km, r.amount,
    r.status, r.invoice_id, r.note,
  ])

  return toCsv(headers, rows)
}

// 経費申請を CSV 用データとして取得する
export async function exportExpenses(ym?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select('expense_id, expense_date, emp_id, ym, category_name, amount, vendor, description, status, approved_at, paid_at')
    .order('expense_date')

  if (ym) query = query.eq('ym', ym)

  const [{ data, error }, nameMap] = await Promise.all([query, getEmpNameMap()])
  if (error) throw new Error(error.message)

  const headers = ['経費ID', '経費日', '社員ID', '氏名', '年月', '区分', '金額', '支払先', '内容', 'ステータス', '承認日', '支払日']
  const rows = (data ?? []).map(r => [
    r.expense_id, r.expense_date, r.emp_id, nameMap[r.emp_id] ?? '',
    r.ym, r.category_name, r.amount, r.vendor, r.description,
    r.status, r.approved_at, r.paid_at,
  ])

  return toCsv(headers, rows)
}

// 勤怠を CSV 用データとして取得する
export async function exportAttendances(ym?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('attendances')
    .select('attendance_id, work_date, emp_id, ym, clock_in, clock_out, break_min, work_min, overtime_min, drive_min, status')
    .order('work_date')

  if (ym) query = query.eq('ym', ym)

  const [{ data, error }, nameMap] = await Promise.all([query, getEmpNameMap()])
  if (error) throw new Error(error.message)

  const headers = ['勤怠ID', '勤務日', '社員ID', '氏名', '年月', '出勤時刻', '退勤時刻', '休憩(分)', '勤務時間(分)', '残業(分)', '運転時間(分)', 'ステータス']
  const rows = (data ?? []).map(r => [
    r.attendance_id, r.work_date, r.emp_id, nameMap[r.emp_id] ?? '',
    r.ym, r.clock_in, r.clock_out, r.break_min,
    r.work_min, r.overtime_min, r.drive_min, r.status,
  ])

  return toCsv(headers, rows)
}
