// 未確認Todo件数（ベルバッジ用）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getUnreadCount } from '@/lib/core/todo'

export async function GET() {
  try {
    const count = await getUnreadCount()
    return NextResponse.json({ count })
  } catch (e) {
    return apiError(e)
  }
}
