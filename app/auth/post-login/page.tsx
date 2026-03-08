import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { createClient } from "@/lib/supabase/server"

function getHomePath(role: "DRIVER" | "ADMIN" | "OWNER") {
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

  // 未登録ユーザーはデモ用自動登録APIで即時DRIVER登録
  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const protocol = host.includes("localhost") ? "http" : "https"
  const baseUrl = `${protocol}://${host}`

  await fetch(`${baseUrl}/api/demo-register`, {
    method: "POST",
    headers: { cookie: headersList.get("cookie") ?? "" },
  })

  redirect("/")
}
