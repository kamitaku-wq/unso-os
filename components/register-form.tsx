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
  const [companyId, setCompanyId] = useState("")
  const [roleRequested, setRoleRequested] = useState<RequestedRole>("DRIVER")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !companyId.trim()) {
      toast.error("氏名と company_id を入力してください")
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
          company_id: companyId.trim(),
        }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "申請の送信に失敗しました"))
      }

      toast.success("申請を受け付けました。管理者の承認をお待ちください")
      setName("")
      setCompanyId("")
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
            会社名または `company_id` は、管理者から共有された情報を入力してください。分からない場合は、先に管理者へ確認してください。
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>申請内容</CardTitle>
            <CardDescription>
              参加先の `company_id`、氏名、希望ロールを入力して送信してください。
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
                <p className="text-xs text-muted-foreground">
                  例: 管理者から案内された会社コードまたは会社ID
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
