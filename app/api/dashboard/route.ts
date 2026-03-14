// 経営ダッシュボード API（OWNER 用・業種別に集計モジュールを切り替え）
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'

import * as transport from '@/lib/industries/transport/dashboard'
import * as carCleaning from '@/lib/industries/car-cleaning/dashboard'

// 会社の業種を取得する
async function getCompanyIndustry(companyId: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.from('companies').select('industry').eq('id', companyId).single()
  return data?.industry ?? 'transport'
}

export async function GET(request: Request) {
  try {
    const me = await requireRole(['OWNER'])
    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('includeAll') === '1'
    const industry = await getCompanyIndustry(me.company_id)

    if (industry === 'car_cleaning') {
      const [
        pendingCounts, monthlyKpi, unbilledAmount, monthlySales, monthlyExpenses,
        monthlyJobCounts, storeBreakdown, workTypeBreakdown,
        expenseCategoryBreakdown, staffAnalysis, attendanceSummary,
      ] = await Promise.all([
        carCleaning.getPendingCounts(),
        carCleaning.getMonthlyKpi(includeAll),
        carCleaning.getUnbilledAmount(),
        carCleaning.getMonthlySales(includeAll),
        carCleaning.getMonthlyExpenses(includeAll),
        carCleaning.getMonthlyJobCounts(includeAll),
        carCleaning.getStoreBreakdown(includeAll),
        carCleaning.getWorkTypeBreakdown(includeAll),
        carCleaning.getExpenseCategoryBreakdown(includeAll),
        carCleaning.getStaffAnalysis(includeAll),
        carCleaning.getAttendanceSummary(),
      ])
      return NextResponse.json({
        industry: 'car_cleaning',
        pendingCounts, monthlyKpi, unbilledAmount, monthlySales, monthlyExpenses,
        monthlyJobCounts, storeBreakdown, workTypeBreakdown,
        expenseCategoryBreakdown, staffAnalysis, attendanceSummary,
      })
    }

    // デフォルト: 運送業
    const [
      pendingCounts, monthlySales, monthlyExpenses, currentMonthByEmployee,
      monthlyKpi, unbilledAmount, expenseCategoryBreakdown, attendanceSummary,
    ] = await Promise.all([
      transport.getPendingCounts(),
      transport.getMonthlySales(includeAll),
      transport.getMonthlyExpenses(includeAll),
      transport.getCurrentMonthByEmployee(),
      transport.getMonthlyKpi(includeAll),
      transport.getUnbilledAmount(),
      transport.getExpenseCategoryBreakdown(includeAll),
      transport.getAttendanceSummary(),
    ])
    return NextResponse.json({
      industry: 'transport',
      pendingCounts, monthlySales, monthlyExpenses, currentMonthByEmployee,
      monthlyKpi, unbilledAmount, expenseCategoryBreakdown, attendanceSummary,
    })
  } catch (e) {
    return apiError(e)
  }
}
