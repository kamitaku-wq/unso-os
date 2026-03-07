// 管理者用：社員 個別更新 API（ロール変更・在籍状態変更）
import { NextResponse } from 'next/server'
import { updateEmployee } from '@/lib/server/employee'
import { requireRole } from '@/lib/server/auth'

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '更新に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
