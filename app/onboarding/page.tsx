// 初回セットアップ完了後のオンボーディング案内ページ（OWNER向け）
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CheckSquare, Copy, Link, PackageOpen, Settings, Users } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { OnboardingCodeCopy } from "./onboarding-code-copy"

export const metadata: Metadata = {
  title: "はじめに | 運送OS",
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  // OWNER の会社情報を取得
  const { data: employee } = await supabase
    .from("employees")
    .select("company_id, role")
    .eq("google_email", user.email)
    .eq("is_active", true)
    .maybeSingle()

  if (!employee || employee.role !== "OWNER") {
    redirect("/")
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name, company_code")
    .eq("id", employee.company_id)
    .maybeSingle()

  const companyCode = company?.company_code ?? ""
  const companyName = company?.name ?? ""

  const steps = [
    {
      icon: Settings,
      title: "荷主・ルート・運賃を登録する",
      description: "運行実績の入力に必要なマスタデータを登録します。",
      href: "/master",
      label: "マスタ管理へ",
    },
    {
      icon: Link,
      title: "招待リンクを発行して社員に送る",
      description: "発行したリンクをドライバーや管理者に共有すると、参加申請フォームへ誘導できます。",
      href: "/admin?tab=invite",
      label: "招待リンクを発行",
    },
    {
      icon: Users,
      title: "社員申請を承認する",
      description: "社員が参加申請を送ると、管理画面の「社員申請」タブで承認できます。",
      href: "/admin?tab=empRequests",
      label: "申請を確認",
    },
    {
      icon: CheckSquare,
      title: "運行実績を確認する",
      description: "ドライバーが実績を登録すると、管理画面で承認・集計できます。",
      href: "/admin",
      label: "管理画面へ",
    },
  ]

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        {/* ヘッダー */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <PackageOpen className="size-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">セットアップ完了！</h1>
            <p className="text-sm text-muted-foreground">
              {companyName} の初期設定が完了しました。以下の手順で運用を開始しましょう。
            </p>
          </div>
        </div>

        {/* 参加コード */}
        <OnboardingCodeCopy companyCode={companyCode} />

        {/* チェックリスト */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            次にやること
          </h2>
          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <a
                key={i}
                href={step.href}
                className="flex items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="size-4 text-primary" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">STEP {i + 1}</span>
                  </div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <span className="shrink-0 text-xs text-primary">→ {step.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* スキップリンク */}
        <div className="text-center">
          <a href="/dashboard" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            ダッシュボードを確認する →
          </a>
        </div>
      </div>
    </main>
  )
}
