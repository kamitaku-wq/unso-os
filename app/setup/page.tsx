import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SetupForm } from "@/components/setup-form"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "初期設定 | 運送OS",
}

export default async function SetupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { count: companyCount } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })

  if ((companyCount ?? 0) > 0) {
    redirect("/auth/post-login")
  }

  return <SetupForm />
}
