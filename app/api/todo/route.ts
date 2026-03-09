// Todo一覧取得・新規作成
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getMyEmployee } from '@/lib/core/auth'
import { getMyTodos, getSentTodos, createPersonalTodo, createAssignedTodo } from '@/lib/core/todo'
import { sendPushToEmployee } from '@/lib/core/push'
import { createClient } from '@/lib/supabase/server'

/** 初回表示用に sent・employees を含めて一括取得（リクエスト数を減らす） */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const withParam = searchParams.get('with') ?? ''

    if (withParam.includes('sent') && withParam.includes('employees')) {
      const me = await getMyEmployee()
      const supabase = await createClient()
      const [todoData, sent, employeesRows] = await Promise.all([
        getMyTodos(),
        getSentTodos(),
        supabase
          .from('employees')
          .select('id, name, role')
          .eq('company_id', me.company_id)
          .eq('is_active', true)
          .neq('id', me.id)
          .order('name'),
      ])
      const employees = employeesRows.data ?? []
      return NextResponse.json({
        ...todoData,
        sent,
        employees: employees.map((r) => ({ id: r.id, name: r.name, role: r.role })),
      })
    }

    const data = await getMyTodos()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, title, assignee_ids, due_date } = body

    if (!title) return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })

    if (type === 'personal') {
      await createPersonalTodo(title, due_date)
    } else if (type === 'assigned') {
      if (!assignee_ids || assignee_ids.length === 0) {
        return NextResponse.json({ error: '送信先を選択してください' }, { status: 400 })
      }
      await createAssignedTodo(title, assignee_ids, due_date)

      // 送信先にWeb Push通知
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: sender } = await supabase
        .from('employees')
        .select('name')
        .eq('google_email', user?.email ?? '')
        .single()

      await Promise.allSettled(
        assignee_ids.map((id: string) =>
          sendPushToEmployee(id, {
            title: '新しいTodoが届きました',
            body: `${sender?.name ?? '誰か'}から: ${title}`,
          })
        )
      )
    } else {
      return NextResponse.json({ error: '不正なtypeです' }, { status: 400 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
