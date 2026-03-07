// 経費区分マスタ API（更新・削除）
import { NextResponse } from 'next/server'
import { updateExpenseCategory, deleteExpenseCategory } from '@/lib/server/master'
import { requireRole } from '@/lib/server/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()
    await updateExpenseCategory(id, body)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '更新に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    await deleteExpenseCategory(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '削除に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
