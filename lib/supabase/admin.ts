// サービスロールクライアント（RLS をスキップ。サーバー側専用）
// 初回セットアップなど、通常の RLS では操作できない処理にのみ使用する
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) throw new Error('Supabase 管理者キーが設定されていません')

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
