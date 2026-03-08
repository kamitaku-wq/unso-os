// 管理者用：社員一覧取得・新規追加 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getEmployees, createEmployee } from '@/lib/core/employee'
import { requireRole } from '@/lib/core/auth'

export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getEmployees()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
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
  } catch (e) {
    return apiError(e)
  }
}
