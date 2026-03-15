"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock } from "lucide-react"
import { toast } from "sonner"

import { ClosingBanner } from "@/components/closing-banner"
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
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatDateTime, getErrorMessage } from "@/lib/format"

type ApiError = {
  error?: string
}

type Attendance = {
  id: string
  attendance_id: string
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
  reject_reason: string | null
  created_at: string | null
}

type AttendanceForm = {
  work_date: string
  clock_in: string
  clock_out: string
  break_min: string
  drive_min: string
  note: string
}


function createInitialAttendanceForm(): AttendanceForm {
  const today = new Date().toISOString().slice(0, 10)

  return {
    work_date: today,
    clock_in: "",
    clock_out: "",
    break_min: "60",
    drive_min: "",
    note: "",
  }
}

function syncDatePart(date: string, value: string) {
  if (!date) return value

  const timePart = value.includes("T") ? value.split("T")[1] : "00:00"
  return `${date}T${timePart}`
}

function formatMinutes(value: number | null) {
  if (value == null) return "-"
  return `${value} 分`
}

function formatWorkPreview(value: number | null) {
  if (value == null) return "-"

  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${hours}時間 ${minutes}分`
}

function getStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "REJECTED") return "却下"
  return "申請中"
}

async function requestJson<T>(
  input: string,
  init: RequestInit | undefined,
  fallbackMessage: string
) {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
  })
  const data = (await response.json()) as T | ApiError

  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallbackMessage))
  }

  return data as T
}

export default function AttendancePageClient() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [form, setForm] = useState<AttendanceForm>(createInitialAttendanceForm)
  const [pageError, setPageError] = useState("")
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [closedMonths, setClosedMonths] = useState<string[]>([])

  const isMutating = busyKey !== null

  const previewWorkMinutes = useMemo(() => {
    if (!form.clock_in || !form.clock_out) return null

    const clockIn = new Date(form.clock_in)
    const clockOut = new Date(form.clock_out)
    const breakMinutes = Number(form.break_min || "0")

    if (
      Number.isNaN(clockIn.getTime()) ||
      Number.isNaN(clockOut.getTime()) ||
      Number.isNaN(breakMinutes)
    ) {
      return null
    }

    const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000)
    if (totalMinutes < 0) return null

    return Math.max(0, totalMinutes - Math.max(0, breakMinutes))
  }, [form.break_min, form.clock_in, form.clock_out])

  useEffect(() => {
    if (pageError) {
      toast.error(pageError)
    }
  }, [pageError])

  useEffect(() => {
    if (submitMessage) {
      toast.success(submitMessage)
    }
  }, [submitMessage])

  const loadAttendances = useCallback(async () => {
    const data = await requestJson<Attendance[]>(
      "/api/attendance",
      undefined,
      "勤怠一覧の取得に失敗しました"
    )
    setAttendances(data)
  }, [])

  const handleCancel = useCallback(
    async (attendance: Attendance) => {
      if (!window.confirm(`勤怠 ${attendance.attendance_id} の申請を取り消しますか？`)) return
      setBusyKey(`cancel:${attendance.id}`)
      try {
        await requestJson(
          `/api/attendance/${attendance.id}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) },
          "取り消しに失敗しました"
        )
        setSubmitMessage(`勤怠 ${attendance.attendance_id} の申請を取り消しました。`)
        await loadAttendances()
      } catch (error) {
        const message = error instanceof Error ? error.message : "取り消しに失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [loadAttendances]
  )

  useEffect(() => {
    async function initialize() {
      setIsLoading(true)
      setPageError("")

      try {
        const [, closingData] = await Promise.all([
          loadAttendances(),
          fetch("/api/closing-status", { cache: "no-store" }).then((r) => r.json() as Promise<{ closedMonths: string[] }>),
        ])
        setClosedMonths(closingData.closedMonths ?? [])
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "画面の読み込みに失敗しました"
        setPageError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [loadAttendances])

  const handleWorkDateChange = useCallback((value: string) => {
    setForm((current) => ({
      ...current,
      work_date: value,
      clock_in: syncDatePart(value, current.clock_in),
      clock_out: syncDatePart(value, current.clock_out),
    }))
  }, [])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!form.clock_in || !form.clock_out) {
        setPageError("出勤時刻と退勤時刻を入力してください")
        return
      }

      const breakMinutes = Number(form.break_min)
      if (!form.break_min.trim() || Number.isNaN(breakMinutes) || breakMinutes < 0) {
        setPageError("休憩時間は 0 以上で入力してください")
        return
      }

      const driveMinutes = form.drive_min.trim() ? Number(form.drive_min) : null
      if (driveMinutes != null && (Number.isNaN(driveMinutes) || driveMinutes < 0)) {
        setPageError("運転時間は 0 以上で入力してください")
        return
      }

      setBusyKey("submit-attendance")
      setPageError("")
      setSubmitMessage("")

      try {
        const result = await requestJson<{ attendance_id: string }>(
          "/api/attendance",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              work_date: form.work_date,
              clock_in: new Date(form.clock_in).toISOString(),
              clock_out: new Date(form.clock_out).toISOString(),
              break_min: breakMinutes,
              drive_min: driveMinutes,
              note: form.note.trim() || null,
            }),
          },
          "勤怠申請に失敗しました"
        )

        setForm(createInitialAttendanceForm())
        await loadAttendances()
        setSubmitMessage(`勤怠 ${result.attendance_id} を申請しました。`)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "勤怠申請に失敗しました"
        setPageError(message)
      } finally {
        setBusyKey(null)
      }
    },
    [form, loadAttendances]
  )

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">勤怠申請</h1>
          <p className="text-sm text-muted-foreground">
            勤務時間を申請し、自分の申請状況を確認する画面です。
          </p>
        </div>

        <ClosingBanner ym={form.work_date.slice(0, 7).replace("-", "")} closedMonths={closedMonths} />

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>新規申請</CardTitle>
              <CardDescription>
                勤務日、出勤時刻、退勤時刻は必須です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="attendance-work-date">勤務日</Label>
                  <Input
                    id="attendance-work-date"
                    type="date"
                    value={form.work_date}
                    onChange={(event) => handleWorkDateChange(event.target.value)}
                    disabled={isLoading || isMutating}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendance-clock-in">出勤時刻</Label>
                  <Input
                    id="attendance-clock-in"
                    type="datetime-local"
                    value={form.clock_in}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clock_in: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendance-clock-out">退勤時刻</Label>
                  <Input
                    id="attendance-clock-out"
                    type="datetime-local"
                    value={form.clock_out}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clock_out: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendance-break-min">休憩時間（分）</Label>
                  <Input
                    id="attendance-break-min"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={form.break_min}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        break_min: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>勤務時間（計算値）</Label>
                  <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    {previewWorkMinutes != null ? (
                      formatWorkPreview(previewWorkMinutes)
                    ) : (
                      <span className="text-muted-foreground">
                        出勤・退勤・休憩を入力すると表示されます。日をまたぐ場合は退勤時刻の日付を手動で翌日にしてください。
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendance-drive-min">運転時間（分）</Label>
                  <Input
                    id="attendance-drive-min"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={form.drive_min}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        drive_min: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    placeholder="任意"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendance-note">備考</Label>
                  <Textarea
                    id="attendance-note"
                    value={form.note}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    disabled={isLoading || isMutating}
                    placeholder="任意"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || isMutating || closedMonths.includes(form.work_date.slice(0, 7).replace("-", ""))}>
                  {busyKey === "submit-attendance" ? "申請中..." : "勤怠を申請"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>自分の勤怠一覧</CardTitle>
                <CardDescription>
                  {isLoading ? "最新データを表示します。" : `最新 ${attendances.length} 件を表示しています。`}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadAttendances()}
                disabled={isLoading || isMutating}
              >
                再読み込み
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton columns={9} rows={4} />
              ) : attendances.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  description="上のフォームから最初の勤怠を登録してください"
                />
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">勤務日</TableHead>
                        <TableHead className="hidden sm:table-cell">申請ID</TableHead>
                        <TableHead className="whitespace-nowrap">勤務時間</TableHead>
                        <TableHead className="hidden md:table-cell">休憩</TableHead>
                        <TableHead className="whitespace-nowrap">実働</TableHead>
                        <TableHead className="hidden md:table-cell">運転</TableHead>
                        <TableHead className="hidden sm:table-cell">残業</TableHead>
                        <TableHead className="whitespace-nowrap">ステータス</TableHead>
                        <TableHead className="hidden lg:table-cell">詳細</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((attendance) => (
                        <TableRow key={attendance.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(attendance.work_date)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{attendance.attendance_id}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div>{formatDateTime(attendance.clock_in)}</div>
                            <div>{formatDateTime(attendance.clock_out)}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{formatMinutes(attendance.break_min)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatMinutes(attendance.work_min)}</TableCell>
                          <TableCell className="hidden md:table-cell">{formatMinutes(attendance.drive_min)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{formatMinutes(attendance.overtime_min)}</TableCell>
                          <TableCell>
                            <StatusBadge status={attendance.status}>
                              {getStatusLabel(attendance.status)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="hidden max-w-72 whitespace-normal text-sm text-muted-foreground lg:table-cell">
                            <div>作成: {formatDateTime(attendance.created_at)}</div>
                            {attendance.approved_at ? (
                              <div>承認: {formatDateTime(attendance.approved_at)}</div>
                            ) : null}
                            {attendance.reject_reason ? (
                              <div>却下理由: {attendance.reject_reason}</div>
                            ) : null}
                            {attendance.note ? <div>備考: {attendance.note}</div> : null}
                          </TableCell>
                          <TableCell>
                            {attendance.status === "SUBMITTED" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleCancel(attendance)}
                                disabled={isMutating}
                              >
                                {busyKey === `cancel:${attendance.id}` ? "取消中..." : "取消"}
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
        </div>
      </div>
    </main>
  )
}
