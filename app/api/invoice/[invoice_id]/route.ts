// 請求書明細 API（特定請求書の実績一覧）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getInvoiceDetail } from '@/lib/industries/transport/invoice'
import { requireRole } from '@/lib/core/auth'

export async function GET(_request: Request, { params }: { params: Promise<{ invoice_id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { invoice_id } = await params
    const data = await getInvoiceDetail(invoice_id)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}
