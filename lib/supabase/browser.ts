// ブラウザ（クライアントコンポーネント）から使う Supabase クライアント
import { createBrowserClient } from '@supabase/ssr'

// Cookie から x-company-id を読み取る
function getCompanyId(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)x-company-id=([^;]+)/)
  return match?.[1]
}

export function createClient() {
  const companyId = getCompanyId()
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: companyId ? { 'x-company-id': companyId } : {},
      },
    }
  )
}
