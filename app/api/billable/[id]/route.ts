// 運行実績 個別操作 API（承認・無効化・削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { approveBillable, voidBillable, deleteBillable } from '@/lib/industries/transport/billable'
import { requireRole } from '@/lib/core/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()

    if (body.action === 'approve') {
      if (body.amount == null || isNaN(Number(body.amount))) {
        return NextResponse.json({ error: '金額を入力してください' }, { status: 400 })
      }
      await approveBillable(id, Number(body.amount), employee.name)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'void') {
      await voidBillable(id, employee.name)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '不正な操作です' }, { status: 400 })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    await deleteBillable(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
