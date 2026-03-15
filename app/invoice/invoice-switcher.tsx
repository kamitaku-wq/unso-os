"use client"

import { useEffect, useState } from "react"

import InvoicePageClient from "./invoice-page-client"
import CleaningInvoiceClient from "./cleaning-invoice-client"

// 会社の enabled_features に応じて請求書画面を切り替える
export default function InvoiceSwitcher() {
  const [mode, setMode] = useState<"loading" | "transport" | "cleaning">("loading")

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(r => r.json())
      .then((data: { custom_settings?: { enabled_features?: Record<string, boolean> } }) => {
        const features = data.custom_settings?.enabled_features
        if (features?.cleaning_job && !features?.billable) {
          setMode("cleaning")
        } else {
          setMode("transport")
        }
      })
      .catch(() => setMode("transport"))
  }, [])

  if (mode === "loading") return <div className="min-h-screen bg-muted/30 px-4 py-8"><div className="text-center text-muted-foreground">読み込み中...</div></div>
  if (mode === "cleaning") return <CleaningInvoiceClient />
  return <InvoicePageClient />
}
