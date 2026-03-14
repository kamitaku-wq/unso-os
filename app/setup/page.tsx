import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SetupForm } from "@/components/setup-form"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata: Metadata = {
  title: "会社セットアップ",
}

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // このユーザーが既に OWNER の会社を持っていればリダイレクト
  const admin = createAdminClient()
  const { data: ownerEmp } = await admin
    .from("employees")
    .select("id")
    .eq("google_email", user.email!)
    .eq("role", "OWNER")
    .maybeSingle()

  if (ownerEmp) {
    redirect("/auth/post-login")
  }

  return <SetupForm />
}
