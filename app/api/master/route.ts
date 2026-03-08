// マスタデータ API（フォームのドロップダウン用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getCustomers, getRoutes, getVehicles } from '@/lib/industries/transport/master'

// 荷主・ルート・車両を一括取得
export async function GET() {
  try {
    const [customers, routes, vehicles] = await Promise.all([
      getCustomers(),
      getRoutes(),
      getVehicles(),
    ])
    return NextResponse.json({ customers, routes, vehicles })
  } catch (e) {
    return apiError(e)
  }
}
