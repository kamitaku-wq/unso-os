"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function getErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error
  }

  return fallback
}

export function SetupForm() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!companyName.trim() || !ownerName.trim()) {
      toast.error("会社名と氏名を入力してください")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          owner_name: ownerName.trim(),
        }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "初回セットアップに失敗しました"))
      }

      router.replace("/")
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "初回セットアップに失敗しました"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">初回セットアップ</h1>
          <p className="text-sm text-muted-foreground">
            最初の会社情報と、最初の OWNER（経営者）情報を登録します。
          </p>
          <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-background px-3 py-2">
              <span className="font-semibold">1.</span> 会社名
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <span className="font-semibold">2.</span> あなたの名前
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <span className="font-semibold">3.</span> 完了
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>セットアップ情報</CardTitle>
            <CardDescription>
              登録が完了すると、このアカウントが最初の OWNER として利用開始できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="setup-company-name">会社名</Label>
                <Input
                  id="setup-company-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-owner-name">氏名</Label>
                <Input
                  id="setup-owner-name"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "登録中..." : "初回セットアップを完了"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
