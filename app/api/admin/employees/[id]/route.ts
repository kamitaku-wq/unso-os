// 管理者用：社員 個別更新・削除 API（ロール変更・在籍状態変更・削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { updateEmployee, deleteEmployee } from '@/lib/core/employee'
import { requireRole } from '@/lib/core/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()
    await updateEmployee(id, {
      role: body.role,
      is_active: body.is_active,
      name: body.name,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    await deleteEmployee(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
