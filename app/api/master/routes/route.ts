// ルートマスタ API（一覧取得・新規登録）
import { NextResponse } from 'next/server'
import { getRoutes, createRoute } from '@/lib/industries/transport/master'
import { requireRole } from '@/lib/core/auth'

export async function GET() {
  try {
    const data = await getRoutes()
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
    await createRoute({
      route_id: body.route_id,
      cust_id: body.cust_id,
      pickup_default: body.pickup_default ?? undefined,
      drop_default: body.drop_default ?? undefined,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '登録に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
