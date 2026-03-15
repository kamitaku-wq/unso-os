// 会社切替ページ（Server Component）
// Cookie を設定してホームにリダイレクトする
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function getHomePath(role: string) {
  if (role === "OWNER") return "/dashboard"
  if (role === "ADMIN") return "/admin"
  return "/"
}

export default async function SwitchCompanyPage(
  props: { searchParams: Promise<{ id?: string }> }
) {
  let debugInfo = ""

  try {
    const params = await props.searchParams
    const companyId = params.id
    debugInfo += `companyId: ${companyId}\n`

    if (!companyId) {
      redirect("/select-company")
    }

    // 認証確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    debugInfo += `user: ${user?.email ?? "null"}\n`

    if (!user?.email) {
      redirect("/login")
    }

    // 所属確認（admin で RLS バイパス）
    const admin = createAdminClient()
    const { data: emp, error: empError } = await admin
      .from("employees")
      .select("role")
      .eq("google_email", user.email)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .maybeSingle()

    debugInfo += `emp: ${JSON.stringify(emp)}, error: ${JSON.stringify(empError)}\n`

    if (!emp) {
      redirect("/select-company")
    }

    // Cookie を設定
    const cookieStore = await cookies()
    cookieStore.set("x-company-id", companyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    debugInfo += `cookie set, redirecting to ${getHomePath(emp.role)}\n`
    redirect(getHomePath(emp.role))
  } catch (e) {
    // redirect() は NEXT_REDIRECT エラーを投げるので、それは再スローする
    if (e instanceof Error && e.message === "NEXT_REDIRECT") {
      throw e
    }
    // Next.js 内部のリダイレクトエラーも再スロー
    const err = e as { digest?: string }
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw e
    }
    // 本当のエラーの場合はデバッグ情報を表示
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border bg-white p-6">
          <h1 className="mb-4 text-lg font-bold text-red-600">会社切替エラー</h1>
          <pre className="mb-4 whitespace-pre-wrap text-sm text-gray-600">{debugInfo}</pre>
          <pre className="whitespace-pre-wrap text-sm text-red-500">
            {e instanceof Error ? e.message : String(e)}
          </pre>
          <a href="/select-company" className="mt-4 block text-sm text-blue-600 underline">
            戻る
          </a>
        </div>
      </main>
    )
  }
}
