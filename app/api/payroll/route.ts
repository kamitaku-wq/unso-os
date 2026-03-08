// 給与台帳 API（一覧取得・給与計算実行）
import { NextResponse } from 'next/server'
import { getPayrolls, calculatePayroll } from '@/lib/server/payroll'
import { requireRole } from '@/lib/server/auth'
import { apiError } from '@/lib/api-error'

// 指定月の給与一覧を取得する
export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const ym = searchParams.get('ym')

    if (!ym || !/^\d{6}$/.test(ym)) {
      return NextResponse.json({ error: 'ym は YYYYMM 形式で指定してください' }, { status: 400 })
    }

    const data = await getPayrolls(ym)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

// 指定月の給与を一括計算して DRAFT として保存する
export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()

    if (!body.ym || !/^\d{6}$/.test(body.ym)) {
      return NextResponse.json({ error: 'ym は YYYYMM 形式で指定してください' }, { status: 400 })
    }

    const data = await calculatePayroll(body.ym)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}
