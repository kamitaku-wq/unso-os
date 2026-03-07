// 管理者用：社員一覧取得・新規追加 API
import { NextResponse } from 'next/server'
import { getEmployees, createEmployee } from '@/lib/server/employee'
import { requireRole } from '@/lib/server/auth'

export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getEmployees()
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()
    const result = await createEmployee({
      name: body.name,
      google_email: body.google_email,
      role: body.role,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '登録に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
