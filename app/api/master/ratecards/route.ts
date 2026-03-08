// 運賃マスタ API（一覧取得・登録/更新）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getRatecards, upsertRatecard } from '@/lib/industries/transport/master'
import { requireRole } from '@/lib/core/auth'

export async function GET() {
  try {
    const data = await getRatecards()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    if (!body.route_id || !body.cust_id || body.base_fare == null) {
      return NextResponse.json({ error: 'route_id, cust_id, base_fare は必須です' }, { status: 400 })
    }
    await upsertRatecard({
      route_id: body.route_id,
      cust_id: body.cust_id,
      base_fare: Number(body.base_fare),
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
