// 月次締め API（一覧取得・締め実行・取り消し）
import { NextResponse } from 'next/server'
import { getClosings, closeMonth, reopenMonth } from '@/lib/server/closing'
import { requireRole } from '@/lib/server/auth'
import { apiError } from '@/lib/api-error'

// 締め済み月一覧を取得
export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getClosings()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

// 月次締めを実行
export async function POST(request: Request) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()

    if (!body.ym || !/^\d{6}$/.test(body.ym)) {
      return NextResponse.json({ error: 'ym は YYYYMM 形式で指定してください' }, { status: 400 })
    }

    const result = await closeMonth(body.ym, employee.name, body.note ?? undefined)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}

// 月次締めを取り消す（OWNER のみ）
export async function DELETE(request: Request) {
  try {
    await requireRole(['OWNER'])
    const { searchParams } = new URL(request.url)
    const ym = searchParams.get('ym')

    if (!ym) return NextResponse.json({ error: 'ym が必要です' }, { status: 400 })

    await reopenMonth(ym)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
