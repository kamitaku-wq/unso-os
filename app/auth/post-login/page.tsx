import { redirect } from "next/navigation"

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

  const { data: pendingRequest } = await supabase
    .from("emp_requests")
    .select("id")
    .eq("google_email", user.email)
    .eq("status", "PENDING")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pendingRequest) {
    redirect("/pending")
  }

  redirect("/register")
}
