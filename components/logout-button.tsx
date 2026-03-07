"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/browser"

export function LogoutButton({
  variant = "outline",
  className,
}: {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  className?: string
}) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

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

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
    >
      {isSigningOut ? "ログアウト中..." : "ログアウト"}
    </Button>
  )
}
