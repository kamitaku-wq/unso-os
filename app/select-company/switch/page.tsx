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

export default async function SwitchCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id: companyId } = await searchParams

  if (!companyId) {
    redirect("/select-company")
  }

  // 認証確認
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    redirect("/login")
  }

  // 所属確認（admin で RLS バイパス）
  const admin = createAdminClient()
  const { data: emp } = await admin
    .from("employees")
    .select("role")
    .eq("google_email", user.email)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle()

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

  redirect(getHomePath(emp.role))
}
