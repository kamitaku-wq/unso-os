// Cron用リマインダーロジック（経費締めリマインド・日報未報告リマインド）
import { createAdminClient } from '@/lib/supabase/admin'

const EXPENSE_CLOSING_DAY = 20

// Todo ID を生成する
function genTodoId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `T-${date}-${rand}`
}

// 経費締めリマインド（毎月19日に全従業員へ個人Todoとして作成）
export async function createExpenseClosingReminders() {
  const now = new Date()
  const day = now.getDate()
  if (day !== EXPENSE_CLOSING_DAY - 1) return { skipped: true, reason: `today is ${day}, not ${EXPENSE_CLOSING_DAY - 1}` }

  const sb = createAdminClient()

  // 全会社の全アクティブ従業員を取得
  const { data: employees, error } = await sb
    .from('employees')
    .select('id, company_id')
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  if (!employees || employees.length === 0) return { created: 0 }

  // 今日の日付で既にリマインドTodoが作られていないか確認（重複防止）
  const today = now.toISOString().slice(0, 10)
  const titlePrefix = '【経費締め】'
  const { data: existing } = await sb
    .from('todos')
    .select('creator_id')
    .like('title', `${titlePrefix}%`)
    .eq('type', 'personal')
    .gte('created_at', `${today}T00:00:00`)
  const alreadyCreated = new Set((existing ?? []).map(t => t.creator_id))

  const title = `${titlePrefix}明日(${EXPENSE_CLOSING_DAY}日)が経費の締め日です。未申請の経費があれば提出してください。`
  const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(EXPENSE_CLOSING_DAY).padStart(2, '0')}`

  const inserts = employees
    .filter(e => !alreadyCreated.has(e.id))
    .map(e => ({
      company_id: e.company_id,
      todo_id: genTodoId(),
      creator_id: e.id,
      type: 'personal' as const,
      title,
      due_date: dueDate,
    }))

  if (inserts.length === 0) return { created: 0, reason: 'already sent' }

  const { error: insertErr } = await sb.from('todos').insert(inserts)
  if (insertErr) throw new Error(insertErr.message)

  return { created: inserts.length }
}

// 日報未報告リマインド（毎朝8時、前日シフトありで cleaning_jobs 未報告の従業員へ割り当てTodo）
export async function createDailyReportReminders() {
  const sb = createAdminClient()
  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  // 前日にシフトが入っている従業員を取得
  const { data: shifts, error: shiftErr } = await sb
    .from('shifts')
    .select('emp_id, company_id')
    .eq('shift_date', yesterdayStr)
  if (shiftErr) throw new Error(shiftErr.message)
  if (!shifts || shifts.length === 0) return { created: 0, reason: 'no shifts yesterday' }

  // 前日に cleaning_jobs を報告済みの従業員を取得（emp_id ベース）
  const { data: reported, error: jobErr } = await sb
    .from('cleaning_jobs')
    .select('emp_id')
    .eq('work_date', yesterdayStr)
  if (jobErr) throw new Error(jobErr.message)
  const reportedEmpIds = new Set((reported ?? []).map(j => j.emp_id))

  // シフトありだが未報告の従業員をフィルタ
  // emp_id（テキスト）と employees.id（UUID）を紐付ける必要がある
  const unreportedShifts = shifts.filter(s => !reportedEmpIds.has(s.emp_id))
  if (unreportedShifts.length === 0) return { created: 0, reason: 'all reported' }

  // shifts.emp_id は employees.id（UUID）
  const unreportedEmpIds = [...new Set(unreportedShifts.map(s => s.emp_id))]

  // しかし cleaning_jobs.emp_id はテキスト形式の emp_id
  // shifts.emp_id は employees.id（UUID） なので、紐付けが必要
  // employees テーブルから UUID → emp_id のマッピングを取得
  const { data: empRows } = await sb
    .from('employees')
    .select('id, emp_id, company_id')
    .in('id', unreportedEmpIds)
    .eq('is_active', true)
  if (!empRows || empRows.length === 0) return { created: 0 }

  // emp_id（テキスト）で cleaning_jobs をチェックし直す
  const empIdTexts = empRows.map(e => e.emp_id)
  const { data: reported2 } = await sb
    .from('cleaning_jobs')
    .select('emp_id')
    .eq('work_date', yesterdayStr)
    .in('emp_id', empIdTexts)
  const reportedTextIds = new Set((reported2 ?? []).map(j => j.emp_id))

  const unreportedEmps = empRows.filter(e => !reportedTextIds.has(e.emp_id))
  if (unreportedEmps.length === 0) return { created: 0, reason: 'all reported (text check)' }

  // 重複防止：今日既に同じリマインドが作られていないか
  const titlePrefix = '【日報未報告】'
  const { data: existingTodos } = await sb
    .from('todos')
    .select('id')
    .like('title', `${titlePrefix}%${yesterdayStr}%`)
    .eq('type', 'assigned')
    .gte('created_at', `${today}T00:00:00`)
  if (existingTodos && existingTodos.length > 0) return { created: 0, reason: 'already sent' }

  // 各会社のADMIN/OWNERを送信者として取得
  const companyIds = [...new Set(unreportedEmps.map(e => e.company_id))]
  const { data: admins } = await sb
    .from('employees')
    .select('id, company_id')
    .in('company_id', companyIds)
    .in('role', ['ADMIN', 'OWNER'])
    .eq('is_active', true)
    .order('role', { ascending: false })

  // 会社ごとに最初のADMIN/OWNERを送信者にする
  const adminByCompany: Record<string, string> = {}
  for (const a of admins ?? []) {
    if (!adminByCompany[a.company_id]) adminByCompany[a.company_id] = a.id
  }

  const title = `${titlePrefix}${yesterdayStr} の作業実績が未報告です。報告してください。`
  let created = 0

  // 会社ごとにまとめて割り当てTodoを作成
  for (const companyId of companyIds) {
    const creatorId = adminByCompany[companyId]
    if (!creatorId) continue

    const assignees = unreportedEmps.filter(e => e.company_id === companyId)
    if (assignees.length === 0) continue

    const { data: todo, error: todoErr } = await sb
      .from('todos')
      .insert({
        company_id: companyId,
        todo_id: genTodoId(),
        creator_id: creatorId,
        type: 'assigned',
        title,
        due_date: today,
      })
      .select('id')
      .single()
    if (todoErr || !todo) continue

    const assignments = assignees.map(e => ({
      todo_id: todo.id,
      company_id: companyId,
      assignee_id: e.id,
    }))
    await sb.from('todo_assignments').insert(assignments)
    created += assignees.length
  }

  return { created }
}
