"use client"

// デモ用ロール切替コンポーネント（全ユーザー対象・DBを直接更新）
import { useState } from "react"
import { useRouter } from "next/navigation"

type Role = "WORKER" | "ADMIN" | "OWNER"

const ROLES: { value: Role; label: string }[] = [
  { value: "WORKER", label: "ワーカー" },
  { value: "ADMIN",  label: "管理者" },
  { value: "OWNER",  label: "経営者" },
]

export function DemoRoleSwitcher({ currentRole }: { currentRole: Role }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function switchRole(role: Role) {
    if (role === currentRole || loading) return
    setLoading(true)
    try {
      await fetch("/api/me/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-dashed border-orange-300 bg-orange-50 px-2 py-1">
      <span className="mr-1 text-xs font-medium text-orange-600">デモ:</span>
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => void switchRole(r.value)}
          disabled={loading}
          className={[
            "rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50",
            currentRole === r.value
              ? "bg-orange-500 text-white"
              : "text-orange-700 hover:bg-orange-100",
          ].join(" ")}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
