// 清掃業務 請求書 API（一覧取得・プレビュー・発行）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getCleaningInvoices, createCleaningInvoice, previewCleaningInvoice } from '@/lib/industries/car-cleaning/invoice'
import { requireRole } from '@/lib/core/auth'

export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getCleaningInvoices()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    const { store_id, period_from, period_to, preview } = body

    if (!store_id || !period_from || !period_to) {
      return NextResponse.json({ error: '店舗・期間（from/to）は必須です' }, { status: 400 })
    }

    if (preview) {
      const targets = await previewCleaningInvoice(store_id, period_from, period_to)
      const total = targets.reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
      return NextResponse.json({ count: targets.length, total_amount: total, items: targets })
    }

    const result = await createCleaningInvoice(store_id, period_from, period_to)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
