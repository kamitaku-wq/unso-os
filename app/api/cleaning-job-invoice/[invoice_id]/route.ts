// 清掃業務 請求書明細・削除 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getCleaningInvoiceDetail, deleteCleaningInvoice } from '@/lib/industries/car-cleaning/invoice'
import { requireRole } from '@/lib/core/auth'

export async function GET(_request: Request, { params }: { params: Promise<{ invoice_id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { invoice_id } = await params
    const data = await getCleaningInvoiceDetail(invoice_id)
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ invoice_id: string }> }) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { invoice_id } = await params
    const result = await deleteCleaningInvoice(invoice_id)
    return NextResponse.json(result)
  } catch (e) {
    return apiError(e)
  }
}
