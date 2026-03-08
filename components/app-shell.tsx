"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Truck, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/browser"
import { DemoRoleSwitcher } from "@/components/demo-role-switcher"

type Role = "DRIVER" | "ADMIN" | "OWNER"

type NavigationItem = {
  href: string
  label: string
}

const ROLE_LABELS: Record<Role, string> = {
  DRIVER: "ドライバー",
  ADMIN: "管理者",
  OWNER: "経営者",
}

function getNavigationItems(role: Role | null): NavigationItem[] {
  const commonItems: NavigationItem[] = [
    { href: "/", label: "運行実績" },
    { href: "/expense", label: "経費" },
    { href: "/attendance", label: "勤怠" },
    { href: "/shift", label: "シフト" },
  ]

  if (role === "ADMIN") {
    return [
      ...commonItems,
      { href: "/invoice", label: "請求書" },
      { href: "/payroll", label: "給与" },
      { href: "/admin", label: "管理" },
      { href: "/master", label: "マスタ" },
    ]
  }

  if (role === "OWNER") {
    return [
      ...commonItems,
      { href: "/invoice", label: "請求書" },
      { href: "/payroll", label: "給与" },
      { href: "/admin", label: "管理" },
      { href: "/master", label: "マスタ" },
      { href: "/dashboard", label: "ダッシュボード" },
    ]
  }

  return commonItems
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({
  children,
  userEmail,
  employeeName,
  role,
  isDemo,
}: {
  children: React.ReactNode
  userEmail: string | null
  employeeName: string | null
  role: Role | null
  isDemo: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigationItems = useMemo(() => getNavigationItems(role), [role])
  const showNavigation =
    !pathname.startsWith("/auth") && pathname !== "/login"
  const showHeaderSignOut = pathname !== "/pending"
  const showRegisterLink = !role && pathname !== "/register" && pathname !== "/pending"

  async function handleSignOut() {
    setIsSigningOut(true)
    setMobileMenuOpen(false)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  if (!showNavigation) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-white/95 shadow-sm backdrop-blur-md">
        {/* ブランドカラーのアクセントライン */}
        <div className="h-1 bg-gradient-to-r from-primary via-blue-400 to-primary/60" />

        <div className="mx-auto max-w-7xl px-4 md:px-6">
          {/* メインヘッダー行 */}
          <div className="flex h-14 items-center justify-between gap-4">
            {/* ロゴ + ユーザー情報 */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex shrink-0 items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                  <Truck className="size-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight text-foreground">
                  運送OS
                </span>
              </Link>

              {/* デスクトップ: ユーザー情報 */}
              <div className="hidden items-center gap-2 sm:flex">
                <span className="select-none text-muted-foreground/40">|</span>
                {employeeName ? (
                  <span className="text-sm text-muted-foreground">{employeeName}</span>
                ) : null}
                {role ? (
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[role]}
                  </Badge>
                ) : null}
                {showRegisterLink ? (
                  <Link
                    href="/register"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    社員申請へ
                  </Link>
                ) : null}
              </div>
            </div>

            {/* 右側: デモスイッチャー + ログアウト + ハンバーガー */}
            <div className="flex items-center gap-2">
              {role && isDemo ? (
                <div className="hidden md:block">
                  <DemoRoleSwitcher currentRole={role} />
                </div>
              ) : null}
              {userEmail && showHeaderSignOut ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="hidden text-muted-foreground hover:text-foreground sm:flex"
                >
                  {isSigningOut ? "ログアウト中..." : "ログアウト"}
                </Button>
              ) : null}

              {/* モバイルのみ表示するハンバーガーボタン */}
              {role ? (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                  aria-label={mobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </button>
              ) : null}
            </div>
          </div>

          {/* デスクトップ ナビゲーション（タブ型アンダーライン） */}
          {role ? (
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="メインナビゲーション"
            >
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "-mb-px flex items-center border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    isActivePath(pathname, item.href)
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        {/* モバイル ドロップダウンメニュー */}
        {mobileMenuOpen && role ? (
          <div className="border-t bg-white md:hidden">
            <div className="mx-auto max-w-7xl px-4 py-3">
              {/* モバイル: ユーザー情報 */}
              <div className="mb-2 flex flex-col gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  {employeeName ? (
                    <span className="text-sm text-muted-foreground">{employeeName}</span>
                  ) : null}
                  {role ? (
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[role]}
                    </Badge>
                  ) : null}
                  {showRegisterLink ? (
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      社員申請へ
                    </Link>
                  ) : null}
                </div>
                {role && isDemo ? <DemoRoleSwitcher currentRole={role} /> : null}
              </div>

              {/* モバイル: ナビリンク */}
              <nav className="flex flex-col gap-0.5" aria-label="モバイルナビゲーション">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={[
                      "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActivePath(pathname, item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                ))}

                {userEmail && showHeaderSignOut ? (
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                    className="mt-1 flex w-full items-center rounded-md border-t px-3 py-2.5 pt-3 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {isSigningOut ? "ログアウト中..." : "ログアウト"}
                  </button>
                ) : null}
              </nav>
            </div>
          </div>
        ) : null}
      </header>

      <div>{children}</div>
    </div>
  )
}
