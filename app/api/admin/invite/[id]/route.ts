// 招待トークン無効化 API
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { revokeInviteToken } from '@/lib/core/invite'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await revokeInviteToken(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
