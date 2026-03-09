"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getErrorMessage } from "@/lib/format"

type RequestedRole = "DRIVER" | "ADMIN"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [companyCode, setCompanyCode] = useState("")
  const [roleRequested, setRoleRequested] = useState<RequestedRole>("DRIVER")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !companyCode.trim()) {
      toast.error("氏名と参加コードを入力してください")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          role_requested: roleRequested,
          company_code: companyCode.trim(),
        }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "申請の送信に失敗しました"))
      }

      toast.success("申請を受け付けました。管理者の承認をお待ちください")
      setName("")
      setCompanyCode("")
      setRoleRequested("DRIVER")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "申請の送信に失敗しました"
      toast.error(message)
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
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            参加コードは、管理者（OWNER）から共有された8文字のコードです。分からない場合は、先に管理者へ確認してください。
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>申請内容</CardTitle>
            <CardDescription>
              参加コード・氏名・希望ロールを入力して送信してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="register-company-code">参加コード</Label>
                <Input
                  id="register-company-code"
                  value={companyCode}
                  onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  placeholder="例: AB3C5D8E"
                  maxLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  管理者から案内された8文字の参加コード
                </p>
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
                    <SelectItem value="DRIVER">ドライバー</SelectItem>
                    <SelectItem value="ADMIN">管理者</SelectItem>
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
