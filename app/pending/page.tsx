import { redirect } from "next/navigation"
import { Clock } from "lucide-react"

import { PendingPolling } from "./pending-polling"
import { LogoutButton } from "@/components/logout-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/format"

function getHomePath(role: "DRIVER" | "ADMIN" | "OWNER") {
  if (role === "OWNER") return "/dashboard"
  if (role === "ADMIN") return "/admin"
  return "/"
}

const ROLE_LABELS: Record<string, string> = {
  DRIVER: "ドライバー",
  ADMIN: "管理者",
  OWNER: "経営者",
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
      <PendingPolling />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex justify-end">
          <LogoutButton variant="ghost" className="text-muted-foreground" />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <Clock className="size-10 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">承認待ち</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            管理者が承認するまでしばらくお待ちください。承認が完了すると、自動的に業務画面へ移動します。
          </p>
          <p className="max-w-xl text-xs text-muted-foreground">
            承認されない場合は、管理者に直接お問い合わせください。再申請が必要な場合は、管理者に申請の取り下げを依頼してから新たに申請してください。
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
              <span>{ROLE_LABELS[pendingRequest.role_requested] ?? pendingRequest.role_requested}</span>
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
