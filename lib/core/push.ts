// Web Push通知のビジネスロジック
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// VAPID設定（環境変数から取得）
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// ── Web Push購読情報をDBに保存 ─────────────────────────

export async function saveSubscription(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('google_email', user.email)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  // 同じendpointがあればupsert（複数デバイス対応）
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      company_id: employee.company_id,
      emp_id: employee.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: 'emp_id,endpoint' }
  )
  if (error) throw new Error(error.message)
}

// ── 購読解除（物理削除）────────────────────────────────

export async function removeSubscription(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('google_email', user.email)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('emp_id', employee.id)
    .eq('endpoint', endpoint)
}

// ── 指定社員にWeb Push送信 ─────────────────────────────

export async function sendPushToEmployee(
  emp_id: string,
  payload: { title: string; body: string }
) {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('emp_id', emp_id)
  if (!subs || subs.length === 0) return

  const message = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        message
      ).catch(() => {
        // 無効な購読は無視（デバイス変更等で失効している場合）
      })
    )
  )
}

// ── 期日当日のTodo保持者にリマインダー通知（Cron用）────

export async function sendDueDateReminders() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  // 期日が今日のTodo一覧を取得
  const { data: todos } = await supabase
    .from('todos')
    .select('id, title, creator_id, type')
    .eq('due_date', today)
  if (!todos || todos.length === 0) return

  const notifySet = new Set<string>()

  for (const todo of todos) {
    if (todo.type === 'personal') {
      // 個人Todoは作成者本人に通知
      notifySet.add(todo.creator_id)
    } else {
      // 割り当てTodoは未対応の受信者に通知
      const { data: assignments } = await supabase
        .from('todo_assignments')
        .select('assignee_id')
        .eq('todo_id', todo.id)
        .is('completed_at', null)
      ;(assignments ?? []).forEach((a) => notifySet.add(a.assignee_id))
    }
  }

  await Promise.allSettled(
    Array.from(notifySet).map((emp_id) =>
      sendPushToEmployee(emp_id, {
        title: '期日のお知らせ',
        body: '本日が期日のTodoがあります。確認してください。',
      })
    )
  )
}
