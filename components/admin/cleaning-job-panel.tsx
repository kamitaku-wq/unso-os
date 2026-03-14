"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ClipboardList } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/table-skeleton"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/format"

type CleaningJob = {
  id: string
  job_id: string
  work_date: string
  store_name: string
  work_name: string
  car_type_text: string | null
  qty: number
  unit_price: number
  amount: number
  emp_id: string
  status: string
}

type StatusFilter = "ALL" | "REVIEW_REQUIRED" | "APPROVED" | "VOID"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "全件" },
  { value: "REVIEW_REQUIRED", label: "承認待ち" },
  { value: "APPROVED", label: "承認済み" },
  { value: "VOID", label: "無効" },
]

function statusLabel(s: string) {
  if (s === "APPROVED") return "承認済み"
  if (s === "VOID") return "無効"
  return "承認待ち"
}

function getCurrentYm() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
}

// 作業実績の承認・無効化・削除を担当するパネルコンポーネント
export function CleaningJobPanel() {
  const [jobs, setJobs] = useState<CleaningJob[]>([])
  const [ym, setYm] = useState(getCurrentYm)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("REVIEW_REQUIRED")
  const [isLoading, setIsLoading] = useState(true)
  const [processingKey, setProcessingKey] = useState("")
  const [jobToVoid, setJobToVoid] = useState<CleaningJob | null>(null)

  const load = useCallback(async (targetYm: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/cleaning-job?ym=${targetYm}`, { cache: "no-store" })
      if (!res.ok) throw new Error(getErrorMessage(await res.json(), "取得に失敗しました"))
      setJobs(await res.json())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load(ym) }, [ym, load])

  const filtered = useMemo(
    () => statusFilter === "ALL" ? jobs : jobs.filter((j) => j.status === statusFilter),
    [jobs, statusFilter]
  )

  const handleApprove = useCallback(async (job: CleaningJob) => {
    setProcessingKey(job.id)
    try {
      const res = await fetch(`/api/cleaning-job/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      if (!res.ok) throw new Error(getErrorMessage(await res.json(), "承認に失敗しました"))
      toast.success(`${job.job_id} を承認しました。`)
      await load(ym)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "承認に失敗しました")
    } finally {
      setProcessingKey("")
    }
  }, [ym, load])

  const handleVoid = useCallback(async () => {
    if (!jobToVoid) return
    setProcessingKey(jobToVoid.id)
    try {
      const res = await fetch(`/api/cleaning-job/${jobToVoid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      })
      if (!res.ok) throw new Error(getErrorMessage(await res.json(), "無効化に失敗しました"))
      toast.success(`${jobToVoid.job_id} を無効にしました。`)
      setJobToVoid(null)
      await load(ym)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "無効化に失敗しました")
    } finally {
      setProcessingKey("")
    }
  }, [jobToVoid, ym, load])

  const handleDelete = useCallback(async (job: CleaningJob) => {
    if (!window.confirm(`${job.job_id} を削除します。よろしいですか？`)) return
    setProcessingKey(job.id)
    try {
      const res = await fetch(`/api/cleaning-job/${job.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(getErrorMessage(await res.json(), "削除に失敗しました"))
      toast.success(`${job.job_id} を削除しました。`)
      await load(ym)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました")
    } finally {
      setProcessingKey("")
    }
  }, [ym, load])

  // 月選択用の入力値（YYYY-MM 形式に変換）
  const ymInputValue = `${ym.slice(0, 4)}-${ym.slice(4, 6)}`

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>絞り込み</CardTitle>
          <CardDescription>月とステータスで作業実績を絞り込みます。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full max-w-xs space-y-2">
              <Label>対象月</Label>
              <Input type="month" value={ymInputValue}
                onChange={(e) => setYm(e.target.value.replace("-", ""))}
                disabled={isLoading} />
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label>ステータス</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} disabled={isLoading}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => void load(ym)} disabled={isLoading}>再読み込み</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>作業実績一覧</CardTitle>
          <CardDescription>{isLoading ? "読み込み中..." : `${filtered.length}件を表示`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={8} rows={4} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} description="条件に合う作業実績がありません" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作業日</TableHead>
                    <TableHead>社員ID</TableHead>
                    <TableHead>店舗</TableHead>
                    <TableHead>作業種別</TableHead>
                    <TableHead>車種</TableHead>
                    <TableHead className="text-right">台数</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((j) => {
                    const isReview = j.status === "REVIEW_REQUIRED"
                    const isVoid = j.status === "VOID"
                    const busy = processingKey === j.id
                    return (
                      <TableRow key={j.id}>
                        <TableCell>{formatDate(j.work_date)}</TableCell>
                        <TableCell>{j.emp_id}</TableCell>
                        <TableCell>{j.store_name}</TableCell>
                        <TableCell>{j.work_name}</TableCell>
                        <TableCell>{j.car_type_text || "—"}</TableCell>
                        <TableCell className="text-right">{j.qty}</TableCell>
                        <TableCell className="text-right">{formatCurrency(j.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={j.status}>{statusLabel(j.status)}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          {isReview ? (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => void handleApprove(j)} disabled={busy}>承認</Button>
                              <Button size="sm" variant="destructive" onClick={() => setJobToVoid(j)} disabled={busy}>無効</Button>
                            </div>
                          ) : isVoid ? (
                            <Button size="sm" variant="destructive" onClick={() => void handleDelete(j)} disabled={busy}>
                              {busy ? "削除中..." : "削除"}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
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

      <AlertDialog open={jobToVoid !== null} onOpenChange={(open) => { if (!open) setJobToVoid(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>実績を無効にしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {jobToVoid ? `${jobToVoid.job_id} を無効にします。元に戻せません。` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingKey}>キャンセル</AlertDialogCancel>
            <AlertDialogAction disabled={!!processingKey}
              onClick={(e) => { e.preventDefault(); void handleVoid() }}>
              {processingKey ? "無効化中..." : "無効にする"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
