// 車両マスタ API（一覧取得・新規登録）
import { NextResponse } from 'next/server'
import { getVehicles, createVehicle } from '@/lib/server/master'
import { requireRole } from '@/lib/server/auth'

export async function GET() {
  try {
    const data = await getVehicles()
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    await createVehicle({
      vehicle_id: body.vehicle_id,
      name: body.name,
      plate_no: body.plate_no ?? undefined,
      vehicle_type: body.vehicle_type ?? undefined,
      capacity_ton: body.capacity_ton ? Number(body.capacity_ton) : undefined,
      memo: body.memo ?? undefined,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '登録に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
