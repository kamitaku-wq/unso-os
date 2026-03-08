// 車両マスタ API（更新・削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { updateVehicle, deleteVehicle } from '@/lib/industries/transport/master'
import { requireRole } from '@/lib/core/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    const body = await request.json()
    await updateVehicle(id, {
      ...body,
      capacity_ton: body.capacity_ton ? Number(body.capacity_ton) : undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { id } = await params
    await deleteVehicle(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
