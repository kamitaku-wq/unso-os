// Todo機能のビジネスロジック（個人Todo・割り当てTodo）
import { createClient } from '@/lib/supabase/server'

// ── 型定義 ──────────────────────────────────────────────────

export type PersonalTodo = {
  id: string
  todo_id: string
  title: string
  due_date: string | null
  created_at: string
}

export type AssignmentStatus = {
  assignee_id: string
  assignee_name: string
  confirmed_at: string | null
  completed_at: string | null
}

export type ReceivedTodo = {
  id: string
  todo_id: string
  title: string
  due_date: string | null
  creator_name: string
  assignment_id: string
  confirmed_at: string | null
  completed_at: string | null
  created_at: string
}

export type SentTodo = {
  id: string
  todo_id: string
  title: string
  due_date: string | null
  assignments: AssignmentStatus[]
  created_at: string
}

// ── ログインユーザー取得（共通処理）─────────────────────────

async function getMe() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('id, company_id, name')
    .eq('google_email', user.email)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  return { supabase, employee }
}

// ── ID 採番 ───────────────────────────────────────────────

function generateTodoId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `T-${date}-${rand}`
}

// ── 個人Todo作成 ──────────────────────────────────────────

export async function createPersonalTodo(title: string, due_date?: string) {
  const { supabase, employee } = await getMe()

  const { error } = await supabase.from('todos').insert({
    company_id: employee.company_id,
    todo_id: generateTodoId(),
    creator_id: employee.id,
    type: 'personal',
    title,
    due_date: due_date ?? null,
  })
  if (error) throw new Error(error.message)
}

// ── 割り当てTodo作成 ──────────────────────────────────────

export async function createAssignedTodo(
  title: string,
  assignee_ids: string[],
  due_date?: string
) {
  const { supabase, employee } = await getMe()
  if (assignee_ids.length === 0) throw new Error('送信先を選択してください')

  const { data: todo, error } = await supabase
    .from('todos')
    .insert({
      company_id: employee.company_id,
      todo_id: generateTodoId(),
      creator_id: employee.id,
      type: 'assigned',
      title,
      due_date: due_date ?? null,
    })
    .select('id')
    .single()
  if (error || !todo) throw new Error(error?.message ?? '作成に失敗しました')

  const assignments = assignee_ids.map((assignee_id) => ({
    todo_id: todo.id,
    company_id: employee.company_id,
    assignee_id,
  }))
  const { error: assignError } = await supabase.from('todo_assignments').insert(assignments)
  if (assignError) throw new Error(assignError.message)
}

// ── 自分のTodo一覧取得（個人 + 受け取った割り当て）────────

export async function getMyTodos(): Promise<{
  personal: PersonalTodo[]
  received: ReceivedTodo[]
}> {
  const { supabase, employee } = await getMe()

  // 個人Todo（自分が作成した personal）
  const { data: personal, error: e1 } = await supabase
    .from('todos')
    .select('id, todo_id, title, due_date, created_at')
    .eq('creator_id', employee.id)
    .eq('type', 'personal')
    .order('created_at', { ascending: false })
  if (e1) throw new Error(e1.message)

  // 受け取った割り当てTodo（completed_at が NULL のもの = 未対応）
  const { data: received, error: e2 } = await supabase
    .from('todo_assignments')
    .select(`
      id,
      confirmed_at,
      completed_at,
      created_at,
      todos (
        id, todo_id, title, due_date, created_at,
        employees!todos_creator_id_fkey ( name )
      )
    `)
    .eq('assignee_id', employee.id)
    .is('completed_at', null)
    .order('created_at', { ascending: false })
  if (e2) throw new Error(e2.message)

  const receivedList: ReceivedTodo[] = (received ?? []).map((a) => {
    const t = a.todos as unknown as {
      id: string; todo_id: string; title: string; due_date: string | null; created_at: string
      employees: { name: string } | null
    }
    return {
      id: t.id,
      todo_id: t.todo_id,
      title: t.title,
      due_date: t.due_date,
      creator_name: t.employees?.name ?? '',
      assignment_id: a.id,
      confirmed_at: a.confirmed_at,
      completed_at: a.completed_at,
      created_at: t.created_at,
    }
  })

  return { personal: personal ?? [], received: receivedList }
}

// ── 送ったTodo一覧 ────────────────────────────────────────

export async function getSentTodos(): Promise<SentTodo[]> {
  const { supabase, employee } = await getMe()

  const { data, error } = await supabase
    .from('todos')
    .select(`
      id, todo_id, title, due_date, created_at,
      todo_assignments (
        id, assignee_id, confirmed_at, completed_at,
        employees!todo_assignments_assignee_id_fkey ( name )
      )
    `)
    .eq('creator_id', employee.id)
    .eq('type', 'assigned')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((t) => ({
    id: t.id,
    todo_id: t.todo_id,
    title: t.title,
    due_date: t.due_date,
    created_at: t.created_at,
    assignments: (t.todo_assignments as unknown as {
      id: string; assignee_id: string; confirmed_at: string | null; completed_at: string | null
      employees: { name: string } | null
    }[]).map((a) => ({
      assignee_id: a.assignee_id,
      assignee_name: a.employees?.name ?? '',
      confirmed_at: a.confirmed_at,
      completed_at: a.completed_at,
    })),
  }))
}

// ── 未確認件数（ベルバッジ用）────────────────────────────

export async function getUnreadCount(): Promise<number> {
  const { supabase, employee } = await getMe()

  const { count, error } = await supabase
    .from('todo_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('assignee_id', employee.id)
    .is('confirmed_at', null)
    .is('completed_at', null)
  if (error) throw new Error(error.message)

  return count ?? 0
}

// ── 個人Todo削除（物理削除）──────────────────────────────

export async function deletePersonalTodo(id: string) {
  const { supabase, employee } = await getMe()

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('creator_id', employee.id)
    .eq('type', 'personal')
  if (error) throw new Error(error.message)
}

// ── 割り当てTodo削除（物理削除・作成者のみ）────────────

export async function deleteAssignedTodo(id: string) {
  const { supabase, employee } = await getMe()

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('creator_id', employee.id)
    .eq('type', 'assigned')
  if (error) throw new Error(error.message)
}

// ── 確認済みにする（受信者が操作）────────────────────────

export async function confirmTodo(assignment_id: string) {
  const { supabase, employee } = await getMe()

  const { error } = await supabase
    .from('todo_assignments')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', assignment_id)
    .eq('assignee_id', employee.id)
  if (error) throw new Error(error.message)
}

// ── 対応済みにする（受信者が操作）────────────────────────
// 全員が対応済みになったら todos 本体を物理削除

export async function completeTodo(assignment_id: string) {
  const { supabase, employee } = await getMe()

  // 自分のassignmentを対応済みに更新
  const { data: updated, error } = await supabase
    .from('todo_assignments')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', assignment_id)
    .eq('assignee_id', employee.id)
    .select('todo_id')
    .single()
  if (error || !updated) throw new Error(error?.message ?? '更新に失敗しました')

  // 同じtodo_idの全assignmentを確認
  const { data: siblings, error: e2 } = await supabase
    .from('todo_assignments')
    .select('completed_at')
    .eq('todo_id', updated.todo_id)
  if (e2) throw new Error(e2.message)

  // 全員対応済みなら todos本体を物理削除（CASCADE で assignments も消える）
  const allDone = (siblings ?? []).every((s) => s.completed_at !== null)
  if (allDone) {
    const { error: e3 } = await supabase
      .from('todos')
      .delete()
      .eq('id', updated.todo_id)
    if (e3) throw new Error(e3.message)
  }
}
