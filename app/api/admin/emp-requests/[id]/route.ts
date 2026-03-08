// 管理者用：社員申請 承認・却下 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { approveEmpRequest, rejectEmpRequest } from '@/lib/core/employee'
import { requireRole } from '@/lib/core/auth'

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
  } catch (e) {
    return apiError(e)
  }
}
