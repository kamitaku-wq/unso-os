// 管理者用：社員申請一覧取得 API
import { NextResponse } from 'next/server'
import { getEmpRequests } from '@/lib/server/employee'
import { requireRole } from '@/lib/server/auth'

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'PENDING'
    const data = await getEmpRequests(status)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    const status = message === '権限がありません' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
