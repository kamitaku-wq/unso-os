// マスタデータ API（フォームのドロップダウン用）
import { NextResponse } from 'next/server'
import { getCustomers, getRoutes, getVehicles } from '@/lib/server/master'

// 荷主・ルート・車両を一括取得
export async function GET() {
  try {
    const [customers, routes, vehicles] = await Promise.all([
      getCustomers(),
      getRoutes(),
      getVehicles(),
    ])
    return NextResponse.json({ customers, routes, vehicles })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
