// サーバーコンポーネント・Route Handler から使う Supabase クライアント
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // Cookie から選択中の会社IDを読み取り、Supabase ヘッダーとして渡す
  const companyId = cookieStore.get('x-company-id')?.value
  const globalHeaders: Record<string, string> = companyId
    ? { 'x-company-id': companyId }
    : {}

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component から呼ばれた場合は set できないが無視してよい
          }
        },
      },
      global: { headers: globalHeaders },
    }
  )
}
