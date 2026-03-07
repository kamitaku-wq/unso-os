// 請求書明細 API（特定請求書の実績一覧）
import { NextResponse } from 'next/server'
import { getInvoiceDetail } from '@/lib/server/invoice'
import { requireRole } from '@/lib/server/auth'

export async function GET(_request: Request, { params }: { params: Promise<{ invoice_id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { invoice_id } = await params
    const data = await getInvoiceDetail(invoice_id)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
