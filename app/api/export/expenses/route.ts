// 経費申請 CSV エクスポート API
import { NextResponse } from 'next/server'
import { exportExpenses } from '@/lib/core/export'
import { requireRole } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const ym = searchParams.get('ym') ?? undefined

    const csv = await exportExpenses(ym)
    const filename = `expenses_${ym ?? 'all'}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return apiError(e, 'エクスポートに失敗しました')
  }
}
