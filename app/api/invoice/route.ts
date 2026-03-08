// 請求書 API（一覧取得・新規発行）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getInvoices, createInvoice, previewInvoice } from '@/lib/industries/transport/invoice'
import { requireRole } from '@/lib/core/auth'

// 請求書一覧取得
export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getInvoices()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

// 請求書発行（または対象実績プレビュー）
export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    const { cust_id, period_from, period_to, preview } = body

    if (!cust_id || !period_from || !period_to) {
      return NextResponse.json({ error: '荷主・期間（from/to）は必須です' }, { status: 400 })
    }

    // preview=true のときは発行せずに対象件数・金額だけ返す
    if (preview) {
      const targets = await previewInvoice(cust_id, period_from, period_to)
      const total = targets.reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
      return NextResponse.json({ count: targets.length, total_amount: total, items: targets })
    }

    const result = await createInvoice(cust_id, period_from, period_to)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
