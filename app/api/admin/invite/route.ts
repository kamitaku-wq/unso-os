// 招待トークン管理 API（一覧取得・新規発行）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { createInviteToken, listInviteTokens } from '@/lib/core/invite'

export async function GET() {
  try {
    const data = await listInviteTokens()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST() {
  try {
    const data = await createInviteToken()
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
