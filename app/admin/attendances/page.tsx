"use client"

import { useCallback, useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { formatDate, formatDateTime, getErrorMessage } from "@/lib/format"

type AttendanceStatus = "ALL" | "SUBMITTED" | "APPROVED" | "REJECTED"

type Attendance = {
  id: string
  attendance_id: string
  emp_id: string
  work_date: string | null
  clock_in: string | null
  clock_out: string | null
  break_min: number | null
  work_min: number | null
  drive_min: number | null
  overtime_min: number | null
  status: string
  note: string | null
  approved_at: string | null
  approved_by: string | null
  reject_reason: string | null
  created_at: string | null
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "SUBMITTED", label: "承認待ち" },
  { value: "APPROVED", label: "承認済み" },
  { value: "REJECTED", label: "却下" },
  { value: "ALL", label: "全件" },
]

function formatMonthInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function toYmValue(value: string) {
  return value.replace("-", "")
}

function formatMinutes(value: number | null) {
  if (value == null) return "-"
  return `${value} 分`
}

function getStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "REJECTED") return "却下"
  return "承認待ち"
}

export default function AdminAttendancesPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus>("SUBMITTED")
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [processingKey, setProcessingKey] = useState("")
  const [exportMonth, setExportMonth] = useState(() => formatMonthInputValue(new Date()))

  useEffect(() => {
    if (pageError) {
      toast.error(pageError)
    }
  }, [pageError])

  useEffect(() => {
    if (actionMessage) {
      toast.success(actionMessage)
    }
  }, [actionMessage])

  useEffect(() => {
    if (hasNoPermission) {
      toast.error("権限がありません")
    }
  }, [hasNoPermission])

  const loadAttendances = useCallback(async (filter: AttendanceStatus) => {
    setIsLoading(true)
    setPageError("")

    const search = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`

    try {
      const response = await fetch(`/api/admin/attendances${search}`, { cache: "no-store" })
      const data = (await response.json()) as Attendance[] | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setAttendances([])
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "勤怠一覧の取得に失敗しました"))
      }

      setHasNoPermission(false)
      setAttendances(Array.isArray(data) ? data : [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "勤怠一覧の取得に失敗しました"
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAttendances(statusFilter)
  }, [loadAttendances, statusFilter])

  const handleDelete = useCallback(
    async (attendance: Attendance) => {
      const confirmed = window.confirm(
        `勤怠 ${attendance.attendance_id} を削除します。この操作は取り消せません。よろしいですか？`
      )
      if (!confirmed) return

      setProcessingKey(attendance.id)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/attendance/${attendance.id}`, { method: "DELETE" })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) throw new Error(getErrorMessage(data, "勤怠の削除に失敗しました"))
        setActionMessage(`勤怠 ${attendance.attendance_id} を削除しました。`)
        await loadAttendances(statusFilter)
      } catch (error) {
        const message = error instanceof Error ? error.message : "勤怠の削除に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [loadAttendances, statusFilter]
  )

  const handleApprove = useCallback(
    async (attendance: Attendance) => {
      const confirmed = window.confirm(
        `勤怠 ${attendance.attendance_id} を承認します。よろしいですか？`
      )
      if (!confirmed) return

      setProcessingKey(attendance.id)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/attendance/${attendance.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "approve" }),
        })
        const data = (await response.json()) as { error?: string }

        if (response.status === 403) {
          setHasNoPermission(true)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "勤怠の承認に失敗しました"))
        }

        setActionMessage(`勤怠 ${attendance.attendance_id} を承認しました。`)
        await loadAttendances(statusFilter)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "勤怠の承認に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [loadAttendances, statusFilter]
  )

  const handleReject = useCallback(
    async (attendance: Attendance) => {
      const reason = window.prompt("却下理由を入力してください")
      if (reason == null) return

      const trimmedReason = reason.trim()
      if (!trimmedReason) {
        setPageError("却下理由を入力してください")
        return
      }

      setProcessingKey(attendance.id)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/attendance/${attendance.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reject",
            reason: trimmedReason,
          }),
        })
        const data = (await response.json()) as { error?: string }

        if (response.status === 403) {
          setHasNoPermission(true)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "勤怠の却下に失敗しました"))
        }

        setActionMessage(`勤怠 ${attendance.attendance_id} を却下しました。`)
        await loadAttendances(statusFilter)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "勤怠の却下に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [loadAttendances, statusFilter]
  )

  const handleCsvDownload = useCallback(() => {
    const params = new URLSearchParams()

    if (exportMonth) params.set("ym", toYmValue(exportMonth))

    window.location.href = `/api/export/attendances?${params.toString()}`
  }, [exportMonth])

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">勤怠承認</h1>
          <p className="text-sm text-muted-foreground">
            管理者が勤怠申請を確認し、承認または却下する画面です。
          </p>
        </div>

        {hasNoPermission ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                この画面を表示する権限がありません。
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>絞り込み</CardTitle>
                <CardDescription>
                  初期表示は承認待ちです。必要に応じて表示対象を切り替えてください。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={statusFilter === option.value ? "default" : "outline"}
                      onClick={() => setStatusFilter(option.value)}
                      disabled={isLoading}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="w-full max-w-xs space-y-2">
                    <Label htmlFor="attendance-export-month">年月</Label>
                    <Input
                      id="attendance-export-month"
                      type="month"
                      value={exportMonth}
                      onChange={(event) => setExportMonth(event.target.value)}
                    />
                  </div>

                  <Button
                    variant="secondary"
                    onClick={handleCsvDownload}
                    disabled={!exportMonth}
                  >
                    CSV ダウンロード
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>勤怠一覧</CardTitle>
                <CardDescription>最新 200 件を表示します。</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableSkeleton columns={10} rows={4} />
                ) : attendances.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    description="上の条件を見直すか、最初の勤怠を登録してください"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>勤務日</TableHead>
                        <TableHead>申請ID</TableHead>
                        <TableHead>社員ID</TableHead>
                        <TableHead>勤務時間</TableHead>
                        <TableHead>休憩</TableHead>
                        <TableHead>運転</TableHead>
                        <TableHead>残業</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>詳細</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((attendance) => {
                        const isSubmitted = attendance.status === "SUBMITTED"
                        const isRejected = attendance.status === "REJECTED"
                        const isProcessing = processingKey === attendance.id

                        return (
                          <TableRow key={attendance.id}>
                            <TableCell>{formatDate(attendance.work_date)}</TableCell>
                            <TableCell>{attendance.attendance_id}</TableCell>
                            <TableCell>{attendance.emp_id}</TableCell>
                            <TableCell>
                              {attendance.clock_in && attendance.clock_out
                                ? `${formatDateTime(attendance.clock_in)} - ${formatDateTime(attendance.clock_out)}`
                                : "-"}
                            </TableCell>
                            <TableCell>{formatMinutes(attendance.break_min)}</TableCell>
                            <TableCell>{formatMinutes(attendance.drive_min)}</TableCell>
                            <TableCell>{formatMinutes(attendance.overtime_min)}</TableCell>
                            <TableCell>
                              <StatusBadge status={attendance.status}>
                                {getStatusLabel(attendance.status)}
                              </StatusBadge>
                            </TableCell>
                            <TableCell className="max-w-80 whitespace-normal text-sm text-muted-foreground">
                              <div>作成: {formatDateTime(attendance.created_at)}</div>
                              {attendance.approved_at ? (
                                <div>
                                  承認: {formatDateTime(attendance.approved_at)}
                                  {attendance.approved_by ? ` / ${attendance.approved_by}` : ""}
                                </div>
                              ) : null}
                              {attendance.reject_reason ? (
                                <div>却下理由: {attendance.reject_reason}</div>
                              ) : null}
                              {attendance.note ? <div>備考: {attendance.note}</div> : null}
                            </TableCell>
                            <TableCell>
                              {isSubmitted ? (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => void handleApprove(attendance)}
                                    disabled={isProcessing}
                                  >
                                    承認
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => void handleReject(attendance)}
                                    disabled={isProcessing}
                                  >
                                    却下
                                  </Button>
                                </div>
                              ) : isRejected ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void handleDelete(attendance)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? "削除中..." : "削除"}
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
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
