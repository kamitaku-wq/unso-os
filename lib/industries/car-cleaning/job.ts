// 清掃作業実績のビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { getMyEmployee, requireRole } from '@/lib/core/auth'
import { isMonthClosed } from '@/lib/core/closing'

export type CleaningJobInput = {
  work_date: string
  store_id: string
  store_name: string
  work_code: string
  work_name: string
  car_type_text: string | null
  id_list_raw: string | null
  qty: number
  unit_price: number
  price_note: string | null
}

export type CleaningJobRow = {
  id: string
  job_id: string
  work_date: string
  ym: string
  store_id: string
  store_name: string
  work_code: string
  work_name: string
  car_type_text: string | null
  id_list_raw: string | null
  qty: number
  unit_price: number
  amount: number
  price_note: string | null
  emp_id: string
  status: string
  created_at: string
}

// job_id を採番する（J-YYYYMMDD-XXXX）
function generateJobId(workDate: string): string {
  const datePart = workDate.replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `J-${datePart}-${rand}`
}

// 作業実績を新規登録する（全ロール可）
export async function createCleaningJob(input: CleaningJobInput) {
  const employee = await getMyEmployee()
  const ym = input.work_date.slice(0, 7).replace('-', '')

  const closed = await isMonthClosed(ym)
  if (closed) throw new Error(`${ym} は締め済みのため登録できません`)

  const supabase = await createClient()
  const amount = input.qty * input.unit_price

  const { data, error } = await supabase
    .from('cleaning_jobs')
    .insert({
      company_id: employee.company_id,
      job_id: generateJobId(input.work_date),
      work_date: input.work_date,
      ym,
      store_id: input.store_id,
      store_name: input.store_name,
      work_code: input.work_code,
      work_name: input.work_name,
      car_type_text: input.car_type_text,
      id_list_raw: input.id_list_raw,
      qty: input.qty,
      unit_price: input.unit_price,
      amount,
      price_note: input.price_note,
      emp_id: employee.emp_id,
      status: 'REVIEW_REQUIRED',
    })
    .select('id, job_id')
    .single()

  if (error) throw new Error(error.message)
  return data
}

// 作業実績一覧を取得する（月指定）
export async function getCleaningJobs(ym: string): Promise<CleaningJobRow[]> {
  await getMyEmployee()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cleaning_jobs')
    .select('id, job_id, work_date, ym, store_id, store_name, work_code, work_name, car_type_text, id_list_raw, qty, unit_price, amount, price_note, emp_id, status, created_at')
    .eq('ym', ym)
    .order('work_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as CleaningJobRow[]
}

// 作業実績を承認する（ADMIN/OWNER のみ）
export async function approveCleaningJob(id: string) {
  const employee = await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('cleaning_jobs')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by: employee.emp_id,
    })
    .eq('id', id)
    .eq('status', 'REVIEW_REQUIRED')

  if (error) throw new Error(error.message)
}

// 作業実績を VOID にする（ADMIN/OWNER のみ）
export async function voidCleaningJob(id: string) {
  const employee = await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('cleaning_jobs')
    .update({
      status: 'VOID',
      void_at: new Date().toISOString(),
      void_by: employee.emp_id,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// VOID の作業実績を削除する（ADMIN/OWNER のみ）
export async function deleteCleaningJob(id: string) {
  await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { data } = await supabase
    .from('cleaning_jobs')
    .select('status')
    .eq('id', id)
    .single()

  if (data?.status !== 'VOID') throw new Error('VOID の実績のみ削除できます')

  const { error } = await supabase.from('cleaning_jobs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
