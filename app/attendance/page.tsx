"use client"

import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
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

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

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

function getErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error
  }

  return fallback
}

function formatDate(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString("ja-JP")
}

function formatDateTime(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString("ja-JP")
}

function formatMinutes(value: number | null) {
  if (value == null) return "-"
  return `${value} 分`
}

function getStatusLabel(status: string) {
  if (status === "APPROVED") return "承認済み"
  if (status === "REJECTED") return "却下"
  return "申請中"
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default"
  if (status === "REJECTED") return "destructive"
  return "secondary"
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

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [form, setForm] = useState<AttendanceForm>(createInitialAttendanceForm)
  const [pageError, setPageError] = useState("")
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const isMutating = busyKey !== null

  const loadAttendances = useCallback(async () => {
    const data = await requestJson<Attendance[]>(
      "/api/attendance",
      undefined,
      "勤怠一覧の取得に失敗しました"
    )
    setAttendances(data)
  }, [])

  useEffect(() => {
    async function initialize() {
      setIsLoading(true)
      setPageError("")

      try {
        await loadAttendances()
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

        {pageError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {pageError}
          </div>
        ) : null}

        {submitMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {submitMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
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
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        work_date: event.target.value,
                      }))
                    }
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
                  <textarea
                    id="attendance-note"
                    className={TEXTAREA_CLASS}
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

                <Button type="submit" className="w-full" disabled={isLoading || isMutating}>
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
                  {isLoading ? "読み込み中です..." : `最新 ${attendances.length} 件を表示しています。`}
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
                <div className="py-8 text-sm text-muted-foreground">
                  勤怠データを読み込み中です...
                </div>
              ) : attendances.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground">
                  まだ勤怠申請はありません。
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>勤務日</TableHead>
                        <TableHead>申請ID</TableHead>
                        <TableHead>勤務時間</TableHead>
                        <TableHead>休憩</TableHead>
                        <TableHead>実働</TableHead>
                        <TableHead>運転</TableHead>
                        <TableHead>残業</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>詳細</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((attendance) => (
                        <TableRow key={attendance.id}>
                          <TableCell>{formatDate(attendance.work_date)}</TableCell>
                          <TableCell>{attendance.attendance_id}</TableCell>
                          <TableCell>
                            <div>{formatDateTime(attendance.clock_in)}</div>
                            <div>{formatDateTime(attendance.clock_out)}</div>
                          </TableCell>
                          <TableCell>{formatMinutes(attendance.break_min)}</TableCell>
                          <TableCell>{formatMinutes(attendance.work_min)}</TableCell>
                          <TableCell>{formatMinutes(attendance.drive_min)}</TableCell>
                          <TableCell>{formatMinutes(attendance.overtime_min)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(attendance.status)}>
                              {getStatusLabel(attendance.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                            <div>作成: {formatDateTime(attendance.created_at)}</div>
                            {attendance.approved_at ? (
                              <div>承認: {formatDateTime(attendance.approved_at)}</div>
                            ) : null}
                            {attendance.reject_reason ? (
                              <div>却下理由: {attendance.reject_reason}</div>
                            ) : null}
                            {attendance.note ? <div>備考: {attendance.note}</div> : null}
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
