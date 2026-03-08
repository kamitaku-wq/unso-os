"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/browser"

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
}: {
  children: React.ReactNode
  userEmail: string | null
  employeeName: string | null
  role: Role | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const navigationItems = useMemo(() => getNavigationItems(role), [role])
  const showNavigation =
    !pathname.startsWith("/auth") && pathname !== "/login"
  const showHeaderSignOut = pathname !== "/pending"
  const showRegisterLink = !role && pathname !== "/register" && pathname !== "/pending"

  async function handleSignOut() {
    setIsSigningOut(true)

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
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                運送OS
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {employeeName ? <span>{employeeName}</span> : null}
                {role ? <Badge variant="secondary">{ROLE_LABELS[role]}</Badge> : null}
                {showRegisterLink ? (
                  <Link href="/register" className="text-primary underline-offset-4 hover:underline">
                    社員申請へ
                  </Link>
                ) : null}
              </div>
            </div>

            {userEmail && showHeaderSignOut ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
              >
                {isSigningOut ? "ログアウト中..." : "ログアウト"}
              </Button>
            ) : null}
          </div>

          {role ? (
            <nav className="flex flex-wrap items-center gap-5 border-b border-border/60">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "border-b-2 pb-2 text-sm font-medium transition-colors",
                    isActivePath(pathname, item.href)
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      <div>{children}</div>
    </div>
  )
}
