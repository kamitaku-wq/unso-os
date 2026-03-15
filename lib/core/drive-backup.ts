// 月次データバックアップ・請求書保存の Google Drive 連携ロジック
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { uploadToDrive, getAccessTokenViaWIF, getOrCreateNestedPath } from './drive-sync'

// 配列データを CSV 文字列に変換する（BOM 付き UTF-8）
function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.join(','), ...rows.map(r => r.map(escape).join(','))]
  return '\uFEFF' + lines.join('\r\n')
}

// CSV をバッファに変換してアップロードする
async function uploadCsv(
  accessToken: string,
  folderId: string,
  fileName: string,
  csvContent: string,
): Promise<void> {
  const buf = new TextEncoder().encode(csvContent).buffer as ArrayBuffer
  await uploadToDrive(accessToken, folderId, fileName, buf, 'text/csv')
}

// バックアップ対象テーブルの定義
type TableDef = {
  table: string
  fileName: string
  columns: string
  headers: string[]
  ymFilter?: boolean
}

const TABLES: TableDef[] = [
  { table: 'billables', fileName: 'billables.csv', columns: 'billable_id, run_date, emp_id, cust_id, route_id, pickup_loc, drop_loc, depart_at, arrive_at, distance_km, amount, status, note', headers: ['実績ID','運行日','社員ID','荷主','ルート','積み地','降ろし地','出発','到着','距離','金額','ステータス','備考'], ymFilter: true },
  { table: 'cleaning_jobs', fileName: 'cleaning_jobs.csv', columns: 'job_id, work_date, emp_id, store_name, work_name, car_type_text, qty, unit_price, amount, status, price_note', headers: ['作業ID','作業日','社員ID','店舗','作業種別','車種','台数','単価','金額','ステータス','備考'], ymFilter: true },
  { table: 'expenses', fileName: 'expenses.csv', columns: 'expense_id, expense_date, emp_id, category_name, amount, vendor, description, status', headers: ['経費ID','経費日','社員ID','区分','金額','支払先','内容','ステータス'], ymFilter: true },
  { table: 'attendances', fileName: 'attendances.csv', columns: 'attendance_id, work_date, emp_id, clock_in, clock_out, break_min, work_min, overtime_min, status', headers: ['勤怠ID','勤務日','社員ID','出勤','退勤','休憩(分)','勤務(分)','残業(分)','ステータス'], ymFilter: true },
  { table: 'payrolls', fileName: 'payrolls.csv', columns: 'id, emp_id, ym, base_salary, overtime_pay, total_deductions, net_pay', headers: ['ID','社員ID','年月','基本給','残業代','控除合計','手取り'], ymFilter: true },
  { table: 'employees', fileName: 'employees.csv', columns: 'emp_id, name, email, role, is_active', headers: ['社員ID','氏名','メール','ロール','有効'] },
  { table: 'customers', fileName: 'customers.csv', columns: 'cust_id, name, short_name, is_active', headers: ['荷主ID','名称','略称','有効'] },
  { table: 'routes', fileName: 'routes.csv', columns: 'route_id, name, default_pickup, default_drop, is_active', headers: ['ルートID','名称','積み地','降ろし地','有効'] },
  { table: 'ratecards', fileName: 'ratecards.csv', columns: 'id, route_id, unit_price', headers: ['ID','ルートID','単価'] },
  { table: 'vehicles', fileName: 'vehicles.csv', columns: 'vehicle_id, plate_number, model, is_active', headers: ['車両ID','ナンバー','車種','有効'] },
  { table: 'expense_categories', fileName: 'expense_categories.csv', columns: 'cat_code, name, is_active', headers: ['区分コード','名称','有効'] },
  { table: 'works', fileName: 'works.csv', columns: 'work_code, name, default_unit_price, is_active', headers: ['作業コード','名称','単価','有効'] },
]

// 月次データバックアップを実行する（締め処理から呼ばれる）
export async function backupMonthlyData(
  oidcToken: string,
  companyId: string,
  ym: string,
): Promise<{ uploaded: number; errors: string[] }> {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 会社の Drive フォルダ ID を取得
  const { data: company } = await admin
    .from('companies')
    .select('custom_settings, is_demo')
    .eq('id', companyId)
    .single()

  const settings = company?.custom_settings as { google_drive_folder_id?: string } | null
  if (!settings?.google_drive_folder_id || company?.is_demo) {
    return { uploaded: 0, errors: [] }
  }

  const accessToken = await getAccessTokenViaWIF(oidcToken)
  const ymFormatted = `${ym.slice(0, 4)}-${ym.slice(4, 6)}`
  const backupFolderId = await getOrCreateNestedPath(
    accessToken, settings.google_drive_folder_id, ['backup', ymFormatted],
  )

  const result = { uploaded: 0, errors: [] as string[] }

  for (const def of TABLES) {
    try {
      const cols = def.columns.split(', ')
      let query = admin.from(def.table).select(def.columns).eq('company_id', companyId)

      // 月次データはymでフィルタ（billablesはYYYY-MM形式、他はYYYYMM形式）
      if (def.ymFilter) {
        if (def.table === 'billables') {
          query = query.eq('ym', ymFormatted)
        } else {
          query = query.eq('ym', ym)
        }
      }

      const { data, error } = await query
      if (error) {
        result.errors.push(`${def.table}: ${error.message}`)
        continue
      }

      const rows = (data ?? []).map(row => cols.map(c => (row as unknown as Record<string, unknown>)[c.trim()] as string | number | null))
      const csv = toCsv(def.headers, rows)
      await uploadCsv(accessToken, backupFolderId, def.fileName, csv)
      result.uploaded++
    } catch (e) {
      result.errors.push(`${def.table}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return result
}

// 請求書PDFを Google Drive に保存する
export async function saveInvoiceToDrive(
  oidcToken: string,
  companyId: string,
  ym: string,
  fileName: string,
  pdfBuffer: ArrayBuffer,
): Promise<string> {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: company } = await admin
    .from('companies')
    .select('custom_settings')
    .eq('id', companyId)
    .single()

  const settings = company?.custom_settings as { google_drive_folder_id?: string } | null
  if (!settings?.google_drive_folder_id) {
    throw new Error('Google Drive フォルダが未設定です')
  }

  const accessToken = await getAccessTokenViaWIF(oidcToken)
  const ymFormatted = ym.includes('-') ? ym : `${ym.slice(0, 4)}-${ym.slice(4, 6)}`
  const invoiceFolderId = await getOrCreateNestedPath(
    accessToken, settings.google_drive_folder_id, ['invoices', ymFormatted],
  )

  return await uploadToDrive(accessToken, invoiceFolderId, fileName, pdfBuffer, 'application/pdf')
}
