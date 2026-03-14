import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function getHomePath(role: "WORKER" | "ADMIN" | "OWNER") {
  if (role === "OWNER") return "/dashboard"
  if (role === "ADMIN") return "/admin"
  return "/"
}

// ログイン後のルーティング（複数会社対応）
export default async function PostLoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  // admin クライアントで全社の所属情報を取得（RLS バイパス）
  const admin = createAdminClient()
  const { data: employees } = await admin
    .from("employees")
    .select("company_id, role, is_active")
    .eq("google_email", user.email)
    .eq("is_active", true)

  const activeEmployees = employees ?? []

  // 複数会社に所属 → 会社選択画面へ
  if (activeEmployees.length > 1) {
    redirect("/select-company")
  }

  // 1社のみ → Cookie を自動設定してホームへ
  if (activeEmployees.length === 1) {
    const emp = activeEmployees[0]
    const cookieStore = await cookies()
    cookieStore.set("x-company-id", emp.company_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
    redirect(getHomePath(emp.role))
  }

  // 未登録: 申請中なら /pending へ
  const { data: pendingRequest } = await admin
    .from("emp_requests")
    .select("request_id")
    .eq("google_email", user.email)
    .eq("status", "PENDING")
    .limit(1)
    .maybeSingle()

  if (pendingRequest) {
    redirect("/pending")
  }

  // 未登録: デモ会社なら自動 WORKER 登録、通常会社なら申請ページへ
  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const protocol = host.includes("localhost") ? "http" : "https"
  const baseUrl = `${protocol}://${host}`

  const res = await fetch(`${baseUrl}/api/demo-register`, {
    method: "POST",
    headers: { cookie: headersList.get("cookie") ?? "" },
  })

  type DemoRegisterResult = { registered: boolean }
  const result = (await res.json()) as DemoRegisterResult

  if (!result.registered) {
    redirect("/register")
  }

  redirect("/")
}
