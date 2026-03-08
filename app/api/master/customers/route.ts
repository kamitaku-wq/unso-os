// 荷主マスタ API（一覧取得・新規登録）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getCustomers, createCustomer } from '@/lib/industries/transport/master'
import { requireRole } from '@/lib/core/auth'

export async function GET() {
  try {
    const data = await getCustomers()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    await createCustomer({
      cust_id: body.cust_id,
      name: body.name,
      address: body.address ?? undefined,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
