// 日報詳細 API（シフト表からクリックで表示する明細）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import { getMyEmployee } from '@/lib/core/auth'

export async function GET(request: Request) {
  try {
    await getMyEmployee()
    const { searchParams } = new URL(request.url)
    const empId = searchParams.get('emp_id')
    const date = searchParams.get('date')
    if (!empId || !date) throw new Error('emp_id と date が必要です')

    const supabase = await createClient()

    const [jobsResult, attendanceResult] = await Promise.all([
      supabase
        .from('cleaning_jobs')
        .select('job_id, store_name, work_name, car_type_text, qty, unit_price, amount, status, id_list_raw')
        .eq('emp_id', empId)
        .eq('work_date', date)
        .neq('status', 'VOID')
        .order('created_at'),
      supabase
        .from('attendances')
        .select('clock_in, clock_out, work_min, overtime_min, status')
        .eq('emp_id', empId)
        .eq('work_date', date)
        .limit(1)
        .maybeSingle(),
    ])

    return NextResponse.json({
      jobs: jobsResult.data ?? [],
      attendance: attendanceResult.data ?? null,
    })
  } catch (e) {
    return apiError(e)
  }
}
