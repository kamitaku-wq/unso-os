"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Link, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime, getErrorMessage } from "@/lib/format"

type InviteToken = {
  id: string
  token: string
  created_by: string
  expires_at: string
  is_active: boolean
  created_at: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init })
  const data = (await res.json()) as T | { error?: string }
  if (!res.ok) throw new Error(getErrorMessage(data, "通信エラーが発生しました"))
  return data as T
}

function getInviteUrl(token: string): string {
  return `${location.origin}/invite?token=${token}`
}

export function InvitePanel() {
  const [tokens, setTokens] = useState<InviteToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchJson<InviteToken[]>("/api/admin/invite")
      setTokens(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "一覧の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTokens()
  }, [loadTokens])

  async function handleCreate() {
    setIsCreating(true)
    try {
      await fetchJson("/api/admin/invite", { method: "POST" })
      await loadTokens()
      toast.success("招待リンクを発行しました")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "発行に失敗しました")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id)
    try {
      await fetchJson(`/api/admin/invite/${id}`, { method: "DELETE" })
      await loadTokens()
      toast.success("招待リンクを無効化しました")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "無効化に失敗しました")
    } finally {
      setRevokingId(null)
    }
  }

  function handleCopy(token: string) {
    void navigator.clipboard.writeText(getInviteUrl(token))
    toast.success("招待リンクをコピーしました")
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>招待リンク</CardTitle>
          <CardDescription>
            リンクを従業員に共有すると、参加申請フォームへ誘導できます。有効期限は発行から7日間です。
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void loadTokens()} disabled={isLoading}>
            再読み込み
          </Button>
          <Button type="button" onClick={() => void handleCreate()} disabled={isCreating || isLoading}>
            {isCreating ? "発行中..." : "新規発行"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton columns={4} rows={3} />
        ) : tokens.length === 0 ? (
          <EmptyState
            icon={Link}
            description="「新規発行」ボタンで招待リンクを作成できます"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>発行日時</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>発行者</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => {
                  const isExpired = new Date(t.expires_at) < new Date()
                  return (
                    <TableRow key={t.id} className={isExpired ? "opacity-50" : ""}>
                      <TableCell>{formatDateTime(t.created_at)}</TableCell>
                      <TableCell>
                        <span className={isExpired ? "text-destructive" : ""}>
                          {formatDateTime(t.expires_at)}
                          {isExpired ? "（期限切れ）" : ""}
                        </span>
                      </TableCell>
                      <TableCell>{t.created_by}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!isExpired && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(t.token)}
                            >
                              <Copy className="mr-1 size-3.5" />
                              コピー
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void handleRevoke(t.id)}
                            disabled={revokingId === t.id}
                          >
                            <Trash2 className="mr-1 size-3.5" />
                            {revokingId === t.id ? "無効化中..." : "無効化"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
