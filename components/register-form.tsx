"use client"

import { useState } from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type RequestedRole = "DRIVER" | "ADMIN"

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

export function RegisterForm() {
  const [name, setName] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [roleRequested, setRoleRequested] = useState<RequestedRole>("DRIVER")
  const [pageError, setPageError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !companyId.trim()) {
      setPageError("氏名と company_id を入力してください")
      return
    }

    setIsSubmitting(true)
    setPageError("")
    setSuccessMessage("")

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          role_requested: roleRequested,
          company_id: companyId.trim(),
        }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "申請の送信に失敗しました"))
      }

      setSuccessMessage("申請を受け付けました。管理者の承認をお待ちください")
      setName("")
      setCompanyId("")
      setRoleRequested("DRIVER")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "申請の送信に失敗しました"
      setPageError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">社員登録申請</h1>
          <p className="text-sm text-muted-foreground">
            ログイン後にまだ社員登録がない場合は、ここから所属申請を送信します。
          </p>
        </div>

        {pageError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {pageError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>申請内容</CardTitle>
            <CardDescription>
              参加先の company_id、氏名、希望ロールを入力して送信してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="register-company-id">company_id</Label>
                <Input
                  id="register-company-id"
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-name">氏名</Label>
                <Input
                  id="register-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>希望ロール</Label>
                <Select
                  value={roleRequested}
                  onValueChange={(value) => setRoleRequested(value as RequestedRole)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="希望ロールを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRIVER">DRIVER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "送信中..." : "申請を送信"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
