// マスタデータ API（フォームのドロップダウン用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getCustomers, getRoutes, getVehicles, getRatecards } from '@/lib/industries/transport/master'

// 荷主・ルート・車両・運賃を一括取得
export async function GET() {
  try {
    const [customers, routes, vehicles, ratecards] = await Promise.all([
      getCustomers(),
      getRoutes(),
      getVehicles(),
      getRatecards(),
    ])
    return NextResponse.json(
      { customers, routes, vehicles, ratecards },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' } }
    )
  } catch (e) {
    return apiError(e)
  }
}
