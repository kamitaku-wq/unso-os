"use client"

import { useCallback, useEffect, useState } from "react"
import { Database } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/format"

type UserRole = "DRIVER" | "ADMIN" | "OWNER"

type ClosingWarnings = {
  pendingBillables: number
  pendingExpenses: number
  pendingAttendances: number
}

type ClosingSummary = {
  ym: string
  approvedSales: number
  approvedExpenses: number
  attendanceSummary: Record<string, { work_min: number; overtime_min: number }>
  warnings: ClosingWarnings
}

type ClosingRecord = {
  id: string
  ym: string
  closed_at: string | null
  closed_by: string | null
  note: string | null
}

type MeResponse =
  | { registered: true; emp_id: string; name: string; role: UserRole; is_active: boolean }
  | { registered: false; email: string | null }
  | { error?: string }

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

function normalizeYmInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 6)
}

function formatYm(value: string) {
  if (!/^\d{6}$/.test(value)) return value
  return `${value.slice(0, 4)}/${value.slice(4, 6)}`
}

function formatNumber(value: number | null) {
  if (value == null) return "-"
  return new Intl.NumberFormat("ja-JP").format(value)
}

function getClosingWarningMessages(warnings: ClosingWarnings) {
  const messages: string[] = []
  if (warnings.pendingBillables > 0) messages.push(`運行実績に未承認が ${warnings.pendingBillables} 件あります。`)
  if (warnings.pendingExpenses > 0) messages.push(`経費申請に未承認が ${warnings.pendingExpenses} 件あります。`)
  if (warnings.pendingAttendances > 0) messages.push(`勤怠申請に未承認が ${warnings.pendingAttendances} 件あります。`)
  return messages
}

function getInitialYm() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  return `${year}${month}`
}

// 月次締めの実行・プレビュー・取り消し・一覧表示を担当するパネルコンポーネント
export function ClosingPanel() {
  const [closings, setClosings] = useState<ClosingRecord[]>([])
  const [closingSummary, setClosingSummary] = useState<ClosingSummary | null>(null)
  const [isClosingListLoading, setIsClosingListLoading] = useState(true)
  const [isClosingActionLoading, setIsClosingActionLoading] = useState(false)
  const [closingYm, setClosingYm] = useState(getInitialYm)
  const [closingNote, setClosingNote] = useState("")
  const [isClosingConfirmOpen, setIsClosingConfirmOpen] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)

  const isClosingBusy = isClosingListLoading || isClosingActionLoading

  // ログイン中の社員ロールを取得する
  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" })
      const data = (await res.json()) as MeResponse
      if (!res.ok) throw new Error(getErrorMessage(data, "社員情報の取得に失敗しました"))
      if ("registered" in data && data.registered) {
        setCurrentUserRole(data.role)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "社員情報の取得に失敗しました")
    }
  }, [])

  // 締め済み一覧を取得する
  const loadClosings = useCallback(async () => {
    setIsClosingListLoading(true)
    try {
      const res = await fetch("/api/admin/closing", { cache: "no-store" })
      const data = (await res.json()) as ClosingRecord[] | { error?: string }
      if (res.status === 403) { setClosings([]); return }
      if (!res.ok) throw new Error(getErrorMessage(data, "締め済み一覧の取得に失敗しました"))
      setClosings(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "締め済み一覧の取得に失敗しました")
    } finally {
      setIsClosingListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCurrentUser()
    void loadClosings()
  }, [loadCurrentUser, loadClosings])

  // 締め前サマリを取得して警告内容を表示する
  const handleClosingPreview = useCallback(async () => {
    if (!/^\d{6}$/.test(closingYm)) {
      toast.error("年月は YYYYMM 形式で入力してください")
      return
    }
    setIsClosingActionLoading(true)
    try {
      const res = await fetch("/api/admin/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ym: closingYm, note: closingNote.trim() || undefined, preview: true }),
      })
      const data = (await res.json()) as ClosingSummary | { error?: string }
      if (res.status === 403) { return }
      if (!res.ok) throw new Error(getErrorMessage(data, "締め前サマリの取得に失敗しました"))
      const summary = data as ClosingSummary
      setClosingSummary(summary)
      const warningMessages = getClosingWarningMessages(summary.warnings)
      toast.success(
        warningMessages.length === 0
          ? `${formatYm(closingYm)} の締め前サマリを取得しました。未承認はありません。`
          : `${formatYm(closingYm)} の締め前サマリを取得しました。警告内容を確認してください。`
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "締め前サマリの取得に失敗しました")
    } finally {
      setIsClosingActionLoading(false)
    }
  }, [closingNote, closingYm])

  // 月次締め確認ダイアログを開く
  const openExecuteClosingDialog = useCallback(() => {
    if (!/^\d{6}$/.test(closingYm)) {
      toast.error("年月は YYYYMM 形式で入力してください")
      return
    }
    setIsClosingConfirmOpen(true)
  }, [closingYm])

  // 月次締めを実行して一覧を更新する
  const handleExecuteClosing = useCallback(async () => {
    if (!/^\d{6}$/.test(closingYm)) {
      toast.error("年月は YYYYMM 形式で入力してください")
      return
    }
    setIsClosingActionLoading(true)
    try {
      const res = await fetch("/api/admin/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ym: closingYm, note: closingNote.trim() || undefined }),
      })
      const data = (await res.json()) as ClosingSummary | { error?: string }
      if (res.status === 403) { return }
      if (!res.ok) throw new Error(getErrorMessage(data, "締め実行に失敗しました"))
      setClosingSummary(data as ClosingSummary)
      toast.success(`${formatYm(closingYm)} の締めを実行しました。`)
      setIsClosingConfirmOpen(false)
      await loadClosings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "締め実行に失敗しました")
    } finally {
      setIsClosingActionLoading(false)
    }
  }, [closingNote, closingYm, loadClosings])

  // 締め済み月を取り消して一覧を更新する
  const handleReopenClosing = useCallback(
    async (ym: string) => {
      if (!window.confirm(`${formatYm(ym)} の締めを取り消します。よろしいですか？`)) return
      setIsClosingActionLoading(true)
      try {
        const res = await fetch(`/api/admin/closing?ym=${encodeURIComponent(ym)}`, { method: "DELETE" })
        const data = (await res.json()) as { error?: string; ok?: boolean }
        if (res.status === 403) { return }
        if (!res.ok) throw new Error(getErrorMessage(data, "締め取り消しに失敗しました"))
        if (closingSummary?.ym === ym) setClosingSummary(null)
        toast.success(`${formatYm(ym)} の締めを取り消しました。`)
        await loadClosings()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "締め取り消しに失敗しました")
      } finally {
        setIsClosingActionLoading(false)
      }
    },
    [closingSummary, loadClosings]
  )

  const closingWarningMessages = closingSummary ? getClosingWarningMessages(closingSummary.warnings) : []

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>月次締め</CardTitle>
          <CardDescription>対象年月の締め前確認と締め実行を行います。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="closing-ym">年月（YYYYMM）</Label>
              <Input
                id="closing-ym"
                inputMode="numeric"
                maxLength={6}
                placeholder="例: 202603"
                value={closingYm}
                onChange={(e) => setClosingYm(normalizeYmInput(e.target.value))}
                disabled={isClosingBusy}
              />
              <p className="text-xs text-muted-foreground">6 桁の年月を入力してください。</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="closing-note">メモ（任意）</Label>
              <textarea
                id="closing-note"
                className={TEXTAREA_CLASS}
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder="締め時の補足メモがあれば入力してください"
                disabled={isClosingBusy}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void handleClosingPreview()} disabled={isClosingBusy}>
              {isClosingActionLoading ? "取得中..." : "締め前サマリ"}
            </Button>
            <Button type="button" onClick={openExecuteClosingDialog} disabled={isClosingBusy}>
              {isClosingActionLoading ? "締め処理中..." : "締め実行"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void loadClosings()} disabled={isClosingBusy}>
              一覧更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {closingSummary ? (
        <Card>
          <CardHeader>
            <CardTitle>締め前サマリ</CardTitle>
            <CardDescription>{formatYm(closingSummary.ym)} 時点の承認済み集計です。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              {closingWarningMessages.length > 0 ? (
                <div className="space-y-1">
                  {closingWarningMessages.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </div>
              ) : (
                <p>未承認データはありません。このまま締め実行できます。</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border px-4 py-3">
                <p className="text-sm text-muted-foreground">承認済み売上</p>
                <p className="mt-1 text-2xl font-semibold">{formatCurrency(closingSummary.approvedSales)}</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-sm text-muted-foreground">承認済み経費</p>
                <p className="mt-1 text-2xl font-semibold">{formatCurrency(closingSummary.approvedExpenses)}</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-sm text-muted-foreground">承認済み勤怠社員数</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatNumber(Object.keys(closingSummary.attendanceSummary).length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>締め済み一覧</CardTitle>
          <CardDescription>登録済みの月次締めを新しい順に表示します。</CardDescription>
        </CardHeader>
        <CardContent>
          {isClosingListLoading ? (
            <TableSkeleton columns={5} rows={4} />
          ) : closings.length === 0 ? (
            <EmptyState icon={Database} description="上のフォームから最初の月次締めを登録してください" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>年月</TableHead>
                    <TableHead>締め日時</TableHead>
                    <TableHead>締め実行者</TableHead>
                    <TableHead>メモ</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closings.map((closing) => (
                    <TableRow key={closing.id}>
                      <TableCell>{formatYm(closing.ym)}</TableCell>
                      <TableCell>{formatDateTime(closing.closed_at)}</TableCell>
                      <TableCell>{closing.closed_by ?? "-"}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal">{closing.note || "-"}</TableCell>
                      <TableCell>
                        {currentUserRole === "OWNER" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleReopenClosing(closing.ym)}
                            disabled={isClosingBusy}
                          >
                            取り消し
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={isClosingConfirmOpen}
        onOpenChange={(open) => {
          if (isClosingActionLoading) return
          setIsClosingConfirmOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{formatYm(closingYm)} を締めますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {formatYm(closingYm)} を締めます。締め後は当月への入力がブロックされます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosingBusy}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={isClosingBusy}
              onClick={(e) => { e.preventDefault(); void handleExecuteClosing() }}
            >
              {isClosingActionLoading ? "締め処理中..." : "締め実行"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
