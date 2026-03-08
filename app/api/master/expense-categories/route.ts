// 経費区分マスタ API（一覧取得・新規登録）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getExpenseCategories, createExpenseCategory } from '@/lib/industries/transport/master'
import { requireRole } from '@/lib/core/auth'

export async function GET() {
  try {
    const data = await getExpenseCategories()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    await createExpenseCategory({
      category_id: body.category_id,
      name: body.name,
      note: body.note ?? undefined,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
