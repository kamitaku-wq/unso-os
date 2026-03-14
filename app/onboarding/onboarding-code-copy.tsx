"use client"

// 参加コードをクリップボードにコピーするクライアントコンポーネント
import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function OnboardingCodeCopy({ companyCode }: { companyCode: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(companyCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          参加コード
        </p>
        <p className="text-xs text-muted-foreground">
          社員がログイン後の申請フォームで入力する8文字のコードです。安全な方法で共有してください。
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex-1 rounded-lg border bg-background px-4 py-2.5 font-mono text-2xl font-bold tracking-[0.2em] text-foreground">
          {companyCode}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 size-4 text-emerald-600" />
              コピー済み
            </>
          ) : (
            <>
              <Copy className="mr-1.5 size-4" />
              コピー
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
