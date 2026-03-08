// 勤怠 個別操作 API（承認・却下・取り消し・削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { approveAttendance, rejectAttendance, cancelAttendance, deleteAttendance } from '@/lib/core/attendance'
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
      case 'cancel':
        // 申請者本人が SUBMITTED を取り消す（ロール不問）
        await cancelAttendance(id)
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
    await deleteAttendance(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
