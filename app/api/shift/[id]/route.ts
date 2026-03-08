// シフト 個別操作 API（削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { deleteShift } from '@/lib/core/shift'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteShift(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
