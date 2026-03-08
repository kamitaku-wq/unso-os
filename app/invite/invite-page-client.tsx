"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Truck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/browser"
import { getErrorMessage } from "@/lib/format"

type PageState = "loading" | "need_login" | "need_name" | "already_registered" | "no_token"

export default function InvitePageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [pageState, setPageState] = useState<PageState>("loading")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setPageState("no_token")
      return
    }

    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setPageState("need_login")
        return
      }

      // 既に employees に登録済みか確認
      const { data: employee } = await supabase
        .from("employees")
        .select("is_active")
        .eq("google_email", user.email!)
        .maybeSingle()

      if (employee?.is_active) {
        setPageState("already_registered")
        return
      }

      // 名前入力画面へ
      const displayName = user.user_metadata?.full_name as string | undefined
      if (displayName) setName(displayName)
      setPageState("need_name")
    }

    void checkSession()
  }, [token])

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // ログイン後にこの招待ページへ戻る
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(`/invite?token=${token}`)}`,
      },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("氏名を入力してください")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim() }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(getErrorMessage(data, "申請に失敗しました"))
      toast.success("申請を送信しました。管理者の承認をお待ちください")
      router.push("/pending")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "申請に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-muted/40 via-background to-muted/20 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* ロゴ */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Truck className="size-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">運送OS</h1>
        </div>

        {pageState === "loading" && (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              読み込み中...
            </CardContent>
          </Card>
        )}

        {pageState === "no_token" && (
          <Card>
            <CardHeader>
              <CardTitle>招待リンクが無効です</CardTitle>
              <CardDescription>
                正しい招待リンクからアクセスしてください。
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {pageState === "need_login" && (
          <Card>
            <CardHeader>
              <CardTitle>参加するにはログインが必要です</CardTitle>
              <CardDescription>
                Google アカウントでログインして参加申請を完了してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => void handleGoogleLogin()}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:bg-accent"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google でログインして参加する
              </button>
            </CardContent>
          </Card>
        )}

        {pageState === "need_name" && (
          <Card>
            <CardHeader>
              <CardTitle>参加申請</CardTitle>
              <CardDescription>
                氏名を確認・入力して申請を送信してください。管理者が承認すると利用開始できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">氏名</Label>
                  <Input
                    id="invite-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 田中一郎"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "送信中..." : "参加申請を送信"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {pageState === "already_registered" && (
          <Card>
            <CardHeader>
              <CardTitle>すでに登録済みです</CardTitle>
              <CardDescription>
                このアカウントはすでに社員として登録されています。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => router.push("/")}>
                ホームへ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
