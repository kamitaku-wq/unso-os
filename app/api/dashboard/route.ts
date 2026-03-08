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
} from '@/lib/server/dashboard'
import { requireRole } from '@/lib/server/auth'
import { apiError } from '@/lib/api-error'

export async function GET() {
  try {
    await requireRole(['OWNER'])

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
      getMonthlySales(),
      getMonthlyExpenses(),
      getCurrentMonthByEmployee(),
      getMonthlyKpi(),
      getUnbilledAmount(),
      getExpenseCategoryBreakdown(),
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
