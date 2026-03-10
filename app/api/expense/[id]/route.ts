// 経費申請 個別操作 API（承認・却下・差し戻し・支払済み・取り消し・削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { approveExpense, rejectExpense, reworkExpense, payExpense, cancelExpense, deleteExpense } from '@/lib/core/expense'
import { requireRole, getMyEmployee } from '@/lib/core/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // 取り消しは申請者本人（ロール不問）が SUBMITTED を取り消す
    if (body.action === 'cancel') {
      await getMyEmployee() // 認証チェックのみ
      await cancelExpense(id)
      return NextResponse.json({ ok: true })
    }

    // それ以外の操作は ADMIN/OWNER のみ
    const employee = await requireRole(['ADMIN', 'OWNER'])

    switch (body.action) {
      case 'approve':
        await approveExpense(id, employee.name)
        break
      case 'reject':
        if (!body.reason) return NextResponse.json({ error: '却下理由を入力してください' }, { status: 400 })
        await rejectExpense(id, employee.name, body.reason)
        break
      case 'rework':
        if (!body.reason) return NextResponse.json({ error: '差し戻し理由を入力してください' }, { status: 400 })
        await reworkExpense(id, body.reason)
        break
      case 'pay':
        await payExpense(id)
        break
      default:
        return NextResponse.json({ error: '不正な操作です' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    await deleteExpense(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
