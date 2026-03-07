// 運行実績 CSV エクスポート API
import { NextResponse } from 'next/server'
import { exportBillables } from '@/lib/server/export'
import { requireRole } from '@/lib/server/auth'
import { apiError } from '@/lib/api-error'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') ?? undefined
    const to   = searchParams.get('to')   ?? undefined

    const csv = await exportBillables(from, to)
    const filename = `billables_${from ?? 'all'}_${to ?? ''}.csv`

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
