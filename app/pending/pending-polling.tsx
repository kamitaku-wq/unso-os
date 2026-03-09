"use client"

// 承認待ち画面のポーリング: 3秒ごとに認証状態を確認し、承認されたら自動リダイレクト
import { useEffect } from "react"
import { useRouter } from "next/navigation"

function getHomePath(role: string) {
  if (role === "OWNER") return "/dashboard"
  if (role === "ADMIN") return "/admin"
  return "/"
}

export function PendingPolling() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { registered?: boolean; role?: string }
        if (data.registered && data.role) {
          clearInterval(interval)
          router.replace(getHomePath(data.role))
        }
      } catch {
        // ネットワークエラーは無視して次のポーリングを待つ
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [router])

  return null
}
