"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Company = {
  id: string
  name: string
  is_demo: boolean
  role: string
}

// 複数会社に所属するユーザー向けの会社選択画面
export default function SelectCompanyClient() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/company/list")
      .then((res) => res.json())
      .then((data: Company[]) => setCompanies(data))
      .catch(() => toast.error("会社一覧の取得に失敗しました"))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSelect(companyId: string) {
    setSwitching(companyId)
    try {
      const res = await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      })
      if (!res.ok) throw new Error("切替に失敗しました")
      // フルリロードで Cookie を確実に反映させる
      window.location.href = "/auth/post-login"
    } catch {
      toast.error("会社の切替に失敗しました")
      setSwitching(null)
    }
  }

  const roleLabel = (role: string) => {
    if (role === "OWNER") return "オーナー"
    if (role === "ADMIN") return "管理者"
    return "ワーカー"
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">会社を選択してください</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">読み込み中...</p>
          ) : companies.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">所属する会社がありません</p>
          ) : (
            companies.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                className="flex h-auto w-full items-center justify-start gap-3 p-4"
                onClick={() => void handleSelect(c.id)}
                disabled={switching !== null}
              >
                <Building2 className="size-5 shrink-0 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">
                    {c.name}
                    {c.is_demo ? <span className="ml-2 text-xs text-muted-foreground">(デモ)</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{roleLabel(c.role)}</div>
                </div>
              </Button>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  )
}
