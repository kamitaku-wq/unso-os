// Todo個別操作（confirm / complete / delete）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { confirmTodo, completeTodo, deletePersonalTodo, deleteAssignedTodo } from '@/lib/core/todo'

type Params = { params: Promise<{ id: string }> }

// PATCH: confirm（確認済み）/ complete（対応済み）
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === 'confirm') {
      await confirmTodo(id)
    } else if (body.action === 'complete') {
      await completeTodo(id)
    } else {
      return NextResponse.json({ error: '不正なactionです' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

// DELETE: 作成者による手動削除
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'personal') {
      await deletePersonalTodo(id)
    } else if (type === 'assigned') {
      await deleteAssignedTodo(id)
    } else {
      return NextResponse.json({ error: 'typeパラメータが必要です' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
