// 経費申請 個別操作 API（承認・却下・差し戻し・支払済み）
import { NextResponse } from 'next/server'
import { approveExpense, rejectExpense, reworkExpense, payExpense } from '@/lib/core/expense'
import { requireRole } from '@/lib/core/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '操作に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
