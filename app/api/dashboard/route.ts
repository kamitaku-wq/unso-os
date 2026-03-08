// 経営ダッシュボード API（OWNER 用）
import { NextResponse } from 'next/server'
import {
  getPendingCounts,
  getMonthlySales,
  getMonthlyExpenses,
  getCurrentMonthByEmployee,
  getMonthlyKpi,
  getUnbilledAmount,
  getExpenseCategoryBreakdown,
  getAttendanceSummary,
} from '@/lib/industries/transport/dashboard'
import { requireRole } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'

export async function GET(request: Request) {
  try {
    await requireRole(['OWNER'])

    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('includeAll') === '1'

    const [
      pendingCounts,
      monthlySales,
      monthlyExpenses,
      currentMonthByEmployee,
      monthlyKpi,
      unbilledAmount,
      expenseCategoryBreakdown,
      attendanceSummary,
    ] = await Promise.all([
      getPendingCounts(),
      getMonthlySales(includeAll),
      getMonthlyExpenses(includeAll),
      getCurrentMonthByEmployee(),
      getMonthlyKpi(includeAll),
      getUnbilledAmount(),
      getExpenseCategoryBreakdown(includeAll),
      getAttendanceSummary(),
    ])

    return NextResponse.json({
      pendingCounts,
      monthlySales,
      monthlyExpenses,
      currentMonthByEmployee,
      monthlyKpi,
      unbilledAmount,
      expenseCategoryBreakdown,
      attendanceSummary,
    })
  } catch (e) {
    return apiError(e)
  }
}
