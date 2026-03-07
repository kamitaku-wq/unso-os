// 請求書 API（一覧取得・新規発行）
import { NextResponse } from 'next/server'
import { getInvoices, createInvoice, previewInvoice } from '@/lib/server/invoice'
import { requireRole } from '@/lib/server/auth'

// 請求書一覧取得
export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getInvoices()
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '請求書発行に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
