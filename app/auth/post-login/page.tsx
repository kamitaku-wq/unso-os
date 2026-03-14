import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { createClient } from "@/lib/supabase/server"

function getHomePath(role: "WORKER" | "ADMIN" | "OWNER") {
  if (role === "OWNER") return "/dashboard"
  if (role === "ADMIN") return "/admin"
  return "/"
}

export default async function PostLoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("role, is_active")
    .eq("google_email", user.email)
    .maybeSingle()

  if (employee?.is_active) {
    redirect(getHomePath(employee.role))
  }

  // 申請済みで承認待ちの場合は /pending へ
  const { data: pendingRequest } = await supabase
    .from("emp_requests")
    .select("request_id")
    .eq("google_email", user.email)
    .eq("status", "PENDING")
    .limit(1)
    .maybeSingle()

  if (pendingRequest) {
    redirect("/pending")
  }

  // 未登録ユーザー: デモ会社なら自動 WORKER 登録、通常会社なら申請ページへ
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
