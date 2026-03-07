// 経営ダッシュボード API（OWNER 用）
import { NextResponse } from 'next/server'
import { getPendingCounts, getMonthlySales, getMonthlyExpenses, getCurrentMonthByEmployee } from '@/lib/server/dashboard'
import { requireRole } from '@/lib/server/auth'

export async function GET() {
  try {
    await requireRole(['OWNER'])

    const [pendingCounts, monthlySales, monthlyExpenses, currentMonthByEmployee] = await Promise.all([
      getPendingCounts(),
      getMonthlySales(),
      getMonthlyExpenses(),
      getCurrentMonthByEmployee(),
    ])

    return NextResponse.json({
      pendingCounts,
      monthlySales,
      monthlyExpenses,
      currentMonthByEmployee,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
