// 給与台帳 個別更新 API（ステータス変更・経費精算額設定）
import { NextResponse } from 'next/server'
import { updatePayrollStatus, updateExpenseReimbursement } from '@/lib/server/payroll'
import { requireRole } from '@/lib/server/auth'
import { apiError } from '@/lib/api-error'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()

    if (body.status === 'CONFIRMED' || body.status === 'PAID') {
      await updatePayrollStatus(id, body.status)
      return NextResponse.json({ ok: true })
    }

    if (typeof body.expense_reimbursement === 'number') {
      await updateExpenseReimbursement(id, body.expense_reimbursement)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '更新内容が不正です' }, { status: 400 })
  } catch (e) {
    return apiError(e)
  }
}
