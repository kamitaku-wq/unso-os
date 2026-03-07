// 勤怠 個別操作 API（承認・却下）
import { NextResponse } from 'next/server'
import { approveAttendance, rejectAttendance } from '@/lib/server/attendance'
import { requireRole } from '@/lib/server/auth'

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '操作に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
