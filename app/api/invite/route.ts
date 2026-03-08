// 招待リンク経由の申請 API（ログイン済みなら誰でも使用可）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { useInviteToken } from '@/lib/core/invite'

export async function POST(request: Request) {
  try {
    const { token, name } = await request.json()
    if (!token || !name?.trim()) {
      return NextResponse.json({ error: 'トークンと氏名は必須です' }, { status: 400 })
    }
    const result = await useInviteToken(token as string, name as string)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
