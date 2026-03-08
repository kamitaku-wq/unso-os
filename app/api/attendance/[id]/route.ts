// 勤怠 個別操作 API（承認・却下）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { approveAttendance, rejectAttendance } from '@/lib/core/attendance'
import { requireRole } from '@/lib/core/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()

    switch (body.action) {
      case 'approve':
        await approveAttendance(id, employee.name)
        break
      case 'reject':
        if (!body.reason) return NextResponse.json({ error: '却下理由を入力してください' }, { status: 400 })
        await rejectAttendance(id, body.reason)
        break
      default:
        return NextResponse.json({ error: '不正な操作です' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
