// 運賃マスタ API（削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { deleteRatecard } from '@/lib/industries/transport/master'
import { requireRole } from '@/lib/core/auth'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    await deleteRatecard(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
