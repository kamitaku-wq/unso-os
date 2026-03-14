// 作業種別マスタ API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getWorkTypes, createWorkType, updateWorkType, reorderWorkTypes } from '@/lib/industries/car-cleaning/master'

export async function GET() {
  try {
    const works = await getWorkTypes()
    return NextResponse.json(works)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await createWorkType(body)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    // 並び替え一括更新
    if (body.action === 'reorder' && Array.isArray(body.orderedIds)) {
      await reorderWorkTypes(body.orderedIds as string[])
      return NextResponse.json({ ok: true })
    }
    const { id, ...input } = body
    if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
    await updateWorkType(id, input)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
