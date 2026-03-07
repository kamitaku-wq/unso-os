import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

function getHomePath(role: "DRIVER" | "ADMIN" | "OWNER") {
  if (role === "OWNER") return "/dashboard"
  if (role === "ADMIN") return "/admin"
  return "/"
}

function formatDateTime(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString("ja-JP")
}

export default async function PendingPage() {
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
    .select("request_id, name, role_requested, submitted_at")
    .eq("google_email", user.email)
    .eq("status", "PENDING")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pendingRequest) {
    redirect("/register")
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">承認待ち</h1>
          <p className="text-sm text-muted-foreground">
            社員申請は送信済みです。管理者の確認が完了するまでお待ちください。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>現在の申請状況</CardTitle>
            <CardDescription>
              申請内容が承認されると、ログイン後に業務画面へ進めるようになります。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">申請ID: </span>
              <span>{pendingRequest.request_id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">氏名: </span>
              <span>{pendingRequest.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">希望ロール: </span>
              <span>{pendingRequest.role_requested}</span>
            </div>
            <div>
              <span className="text-muted-foreground">申請日時: </span>
              <span>{formatDateTime(pendingRequest.submitted_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
