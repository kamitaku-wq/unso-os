// 招待トークンのビジネスロジック
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/core/auth'

export type InviteToken = {
  id: string
  token: string
  created_by: string
  expires_at: string
  is_active: boolean
  created_at: string
}

// 招待トークンを新規発行する（ADMIN/OWNER のみ）
export async function createInviteToken(): Promise<InviteToken> {
  const employee = await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invite_tokens')
    .insert({ company_id: employee.company_id, created_by: employee.emp_id })
    .select('id, token, created_by, expires_at, is_active, created_at')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'トークン発行に失敗しました')
  return data as InviteToken
}

// 有効な招待トークン一覧を取得する（ADMIN/OWNER のみ）
export async function listInviteTokens(): Promise<InviteToken[]> {
  await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invite_tokens')
    .select('id, token, created_by, expires_at, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as InviteToken[]
}

// 招待トークンを無効化する（ADMIN/OWNER のみ）
export async function revokeInviteToken(id: string): Promise<void> {
  await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('invite_tokens')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// 招待トークンを使って申請を作成する（未登録ユーザー用・サービスロールでトークン検証）
export async function useInviteToken(token: string, name: string): Promise<{ request_id: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('ログインが必要です')

  // サービスロールでトークンを検証（RLS をバイパス）
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: tokenRow } = await admin
    .from('invite_tokens')
    .select('id, company_id, expires_at, is_active')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) throw new Error('招待リンクが無効です')
  if (!tokenRow.is_active) throw new Error('この招待リンクは無効化されています')
  if (new Date(tokenRow.expires_at) < new Date()) throw new Error('招待リンクの有効期限が切れています')

  // 既に申請済みか確認
  const { data: existing } = await admin
    .from('emp_requests')
    .select('request_id, status')
    .eq('google_email', user.email)
    .eq('company_id', tokenRow.company_id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'PENDING') throw new Error('すでに申請済みです。承認をお待ちください')
    if (existing.status === 'APPROVED') throw new Error('すでに登録済みです')
  }

  // 既に employees に登録済みか確認
  const { data: existingEmp } = await admin
    .from('employees')
    .select('emp_id')
    .eq('google_email', user.email)
    .eq('company_id', tokenRow.company_id)
    .maybeSingle()

  if (existingEmp) throw new Error('すでにこの会社の社員として登録済みです')

  // 申請を作成
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const request_id = `REQ-${date}-${rand}`

  const { error } = await admin.from('emp_requests').insert({
    request_id,
    company_id: tokenRow.company_id,
    name: name.trim(),
    google_email: user.email,
    role_requested: 'DRIVER',
    status: 'PENDING',
    submitted_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
  return { request_id }
}
