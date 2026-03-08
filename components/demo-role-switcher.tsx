"use client"

// デモ用ロール切替コンポーネント
// OWNERがログイン中のみ表示され、ナビゲーションの見た目を切り替える
import { useRouter } from "next/navigation"

type Role = "DRIVER" | "ADMIN" | "OWNER"

const ROLES: { value: Role; label: string }[] = [
  { value: "DRIVER", label: "ドライバー" },
  { value: "ADMIN",  label: "管理者" },
  { value: "OWNER",  label: "経営者" },
]

export function DemoRoleSwitcher({ currentDisplayRole }: { currentDisplayRole: Role }) {
  const router = useRouter()

  function switchRole(role: Role) {
    document.cookie = `demo_role=${role}; path=/; max-age=86400`
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-dashed border-orange-300 bg-orange-50 px-2 py-1">
      <span className="mr-1 text-xs font-medium text-orange-600">デモ:</span>
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => switchRole(r.value)}
          className={[
            "rounded px-2 py-0.5 text-xs font-medium transition-colors",
            currentDisplayRole === r.value
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
