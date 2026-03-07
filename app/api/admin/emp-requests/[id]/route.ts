// 管理者用：社員申請 承認・却下 API
import { NextResponse } from 'next/server'
import { approveEmpRequest, rejectEmpRequest } from '@/lib/server/employee'
import { requireRole } from '@/lib/server/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()

    if (body.action === 'approve') {
      const result = await approveEmpRequest(id, employee.name)
      return NextResponse.json(result)
    }

    if (body.action === 'reject') {
      await rejectEmpRequest(id, employee.name, body.note ?? undefined)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '不正な操作です' }, { status: 400 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '操作に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
