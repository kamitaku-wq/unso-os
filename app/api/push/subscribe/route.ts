// Web Push購読の登録・解除
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { saveSubscription, removeSubscription } from '@/lib/core/push'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await saveSubscription(body)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    await removeSubscription(body.endpoint)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
