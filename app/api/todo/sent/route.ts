// 自分が送った割り当てTodo一覧
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getSentTodos } from '@/lib/core/todo'

export async function GET() {
  try {
    const data = await getSentTodos()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}
