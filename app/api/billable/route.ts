// 運行実績 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createBillable, getMyBillables } from '@/lib/industries/transport/billable'

// 自分の運行実績一覧を取得（短時間キャッシュで再表示を軽量化）
export async function GET() {
  try {
    const data = await getMyBillables()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
      },
    })
  } catch (e) {
    return apiError(e)
  }
}

// 運行実績を新規登録
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.run_date) return NextResponse.json({ error: '運行日は必須です' }, { status: 400 })
    const result = await createBillable({
      run_date: body.run_date,
      cust_id: body.cust_id ?? null,
      route_id: body.route_id ?? null,
      pickup_loc: body.pickup_loc ?? null,
      drop_loc: body.drop_loc ?? null,
      depart_at: body.depart_at ?? null,
      arrive_at: body.arrive_at ?? null,
      vehicle_id: body.vehicle_id ?? null,
      distance_km: body.distance_km ? Number(body.distance_km) : null,
      note: body.note ?? null,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
