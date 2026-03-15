"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, CalendarCog, Users } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { DailyReportModal } from "@/components/shift/daily-report-modal"
import { RoutineModal } from "@/components/shift/routine-modal"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocationPicker } from "@/components/shift/location-picker"
import { getErrorMessage } from "@/lib/format"

// --- 型定義 ---
type Role = "WORKER" | "ADMIN" | "OWNER"

type Employee = {
  emp_id: string
  name: string
}

type ShiftRow = {
  id: string
  emp_id: string
  shift_date: string
  is_day_off: boolean
  location: string | null
  work_type: string | null
  note: string | null
}

type DailySummary = {
  clockIn: string | null
  clockOut: string | null
  totalAmount: number
  jobCount: number
}

type ShiftData = {
  shifts: ShiftRow[]
  employees: Employee[]
  role: Role | null
  dailySummaries?: Record<string, DailySummary>
}

type ModalState = {
  emp_id: string
  shift_date: string
  is_day_off: boolean
  location: string
  work_type: string
  note: string
  existing_id: string | null
}

// --- ユーティリティ関数 ---
// 週の月曜日（Date）を返す
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Date を "YYYY-MM-DD" 形式に変換する
function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// "YYYY-MM-DD" を "M/D" 形式に変換する
function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00")
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 週の7日分の "YYYY-MM-DD" 配列を返す
function getWeekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return toISODate(d)
  })
}

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init })
  const data = (await res.json()) as T | { error?: string }
  if (!res.ok) throw new Error(getErrorMessage(data, "通信エラーが発生しました"))
  return data as T
}

// --- メインコンポーネント ---
export default function ShiftPageClient() {
  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()))
  const [shiftData, setShiftData] = useState<ShiftData>({ shifts: [], employees: [], role: null })
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ルーティン関連
  type RoutineRow = { emp_id: string; day_of_week: number; is_day_off: boolean; location: string | null; work_type: string | null; note: string | null }
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [routineTarget, setRoutineTarget] = useState<{ empId: string; empName: string } | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  // 日報詳細モーダル
  const [reportTarget, setReportTarget] = useState<{ empId: string; empName: string; date: string } | null>(null)

  // 客先マスタ（場所プルダウン用）
  type CustomerOption = { cust_id: string; name: string }
  const [customers, setCustomers] = useState<CustomerOption[]>([])

  const weekDates = getWeekDates(monday)
  const canEdit = (shiftData.role ?? role) === "ADMIN" || (shiftData.role ?? role) === "OWNER"

  // 指定週のシフトを取得する（role も同時に返るため /api/me は不要）
  const loadShifts = useCallback(async (mon: Date) => {
    setIsLoading(true)
    try {
      const from = toISODate(mon)
      const sun = new Date(mon)
      sun.setDate(sun.getDate() + 6)
      const to = toISODate(sun)
      const data = await fetchJson<ShiftData>(`/api/shift?from=${from}&to=${to}`)
      setShiftData(data)
      setRole(data.role ?? null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "シフトの取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ルーティンを取得する
  const loadRoutines = useCallback(async () => {
    try {
      const data = await fetchJson<RoutineRow[]>("/api/shift/routine")
      setRoutines(data)
    } catch {
      // WORKER の場合は 403 なので無視
    }
  }, [])

  // 客先マスタを取得する
  const loadCustomers = useCallback(async () => {
    try {
      const data = await fetchJson<CustomerOption[]>("/api/master/customers")
      setCustomers(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    void loadShifts(monday)
    void loadRoutines()
    void loadCustomers()
  }, [monday, loadShifts, loadRoutines, loadCustomers])

  // ルーティンを現在の週に適用する
  async function handleApplyRoutines() {
    setIsApplying(true)
    try {
      const data = await fetchJson<{ applied: number }>("/api/shift/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", monday: toISODate(monday) }),
      })
      if (data.applied > 0) {
        toast.success(`ルーティンから ${data.applied} 件のシフトを生成しました`)
        await loadShifts(monday)
      } else {
        toast.info("適用するシフトがありません（既に登録済み）")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "適用に失敗しました")
    } finally {
      setIsApplying(false)
    }
  }

  // セルクリック時にモーダルを開く
  function openModal(emp_id: string, shift_date: string) {
    if (!canEdit) return
    const existing = shiftData.shifts.find(
      (s) => s.emp_id === emp_id && s.shift_date === shift_date
    )
    setModal({
      emp_id,
      shift_date,
      is_day_off: existing?.is_day_off ?? false,
      location: existing?.location ?? "",
      work_type: existing?.work_type ?? "",
      note: existing?.note ?? "",
      existing_id: existing?.id ?? null,
    })
  }

  // シフトを保存する
  async function handleSave() {
    if (!modal) return
    setIsSaving(true)
    try {
      await fetchJson("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_id: modal.emp_id,
          shift_date: modal.shift_date,
          is_day_off: modal.is_day_off,
          location: modal.location || null,
          work_type: modal.work_type || null,
          note: modal.note || null,
        }),
      })
      setModal(null)
      await loadShifts(monday)
      toast.success("シフトを保存しました")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  // シフトを削除する
  async function handleDelete() {
    if (!modal?.existing_id) return
    setIsSaving(true)
    try {
      await fetchJson(`/api/shift/${modal.existing_id}`, { method: "DELETE" })
      setModal(null)
      await loadShifts(monday)
      toast.success("シフトを削除しました")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  // シフトデータを "emp_id_shift_date" キーで引けるMapに変換（O(n)で一度だけ構築）
  const shiftMap = useMemo(() => {
    const map = new Map<string, (typeof shiftData.shifts)[number]>()
    for (const s of shiftData.shifts) {
      map.set(`${s.emp_id}_${s.shift_date}`, s)
    }
    return map
  }, [shiftData.shifts])

  // セルに表示するテキストを返す（O(1) Map検索）
  function getCellContent(emp_id: string, shift_date: string) {
    const shift = shiftMap.get(`${emp_id}_${shift_date}`)
    const summary = shiftData.dailySummaries?.[`${emp_id}_${shift_date}`] ?? null
    if (!shift && !summary) return null
    if (shift?.is_day_off) return { text: "休み", isDayOff: true, summary: null }
    const parts = [shift?.location, shift?.work_type].filter(Boolean)
    const shiftText = parts.join(" / ") || (shift ? "（内容未設定）" : "")
    return { text: shiftText, isDayOff: false, summary }
  }

  const mondayLabel = toISODate(monday).replace(/-/g, "/")
  const sundayLabel = toISODate(new Date(monday.getTime() + 6 * 86400000)).replace(/-/g, "/")

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">シフト管理</h1>
          <p className="text-sm text-muted-foreground">
            チーム全員の週間シフトを確認できます。
            {canEdit ? "セルをクリックして編集できます。" : ""}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prev = new Date(monday)
                    prev.setDate(prev.getDate() - 7)
                    setMonday(prev)
                  }}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">前の週</span>
                </Button>
                <CardTitle className="text-sm sm:text-base">
                  {mondayLabel} 〜 {sundayLabel}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = new Date(monday)
                    next.setDate(next.getDate() + 7)
                    setMonday(next)
                  }}
                >
                  <span className="hidden sm:inline">次の週</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => void handleApplyRoutines()}
                  disabled={isApplying}
                >
                  <CalendarCog className="mr-1 size-4" />
                  {isApplying ? "適用中..." : "ルーティン適用"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={8} rows={5} />
            ) : shiftData.employees.length === 0 ? (
              <EmptyState icon={Users} description="社員が登録されていません" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 min-w-20 bg-muted/80 px-2 py-2 text-left text-xs font-medium text-muted-foreground sm:min-w-24 sm:px-3 sm:text-sm">
                        社員
                      </th>
                      {weekDates.map((date, i) => (
                        <th
                          key={date}
                          className={[
                            "min-w-16 px-1 py-2 text-center text-xs font-medium sm:min-w-24 sm:px-2 sm:text-sm",
                            i >= 5 ? "text-blue-600" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          <div>{DAY_LABELS[i]}</div>
                          <div className="text-xs font-normal">{formatShortDate(date)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shiftData.employees.map((emp, rowIdx) => (
                      <tr
                        key={emp.emp_id}
                        className={rowIdx % 2 === 0 ? "bg-white" : "bg-muted/20"}
                      >
                        <td className="sticky left-0 z-10 border-r bg-inherit px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                          <div className="flex items-center gap-1">
                            <span>{emp.name}</span>
                            {canEdit && (
                              <button
                                className="text-muted-foreground hover:text-foreground p-0.5"
                                title="ルーティン設定"
                                onClick={() => setRoutineTarget({ empId: emp.emp_id, empName: emp.name })}
                              >
                                <CalendarCog className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        {weekDates.map((date) => {
                          const cell = getCellContent(emp.emp_id, date)
                          return (
                            <td
                              key={date}
                              onClick={() => openModal(emp.emp_id, date)}
                              className={[
                                "border border-muted px-2 py-2 text-center align-middle",
                                canEdit
                                  ? "cursor-pointer hover:bg-primary/5"
                                  : "",
                                cell?.isDayOff
                                  ? "text-muted-foreground"
                                  : "text-foreground",
                              ].join(" ")}
                            >
                              {cell ? (
                                <div className="space-y-0.5">
                                  {cell.text ? (
                                    <span className={cell.isDayOff ? "text-xs" : "text-xs font-medium"}>
                                      {cell.text}
                                    </span>
                                  ) : null}
                                  {cell.summary ? (
                                    <div
                                      className="text-[10px] leading-tight text-emerald-600 cursor-pointer hover:underline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setReportTarget({ empId: emp.emp_id, empName: emp.name, date })
                                      }}
                                    >
                                      {cell.summary.clockIn && cell.summary.clockOut
                                        ? `${cell.summary.clockIn}–${cell.summary.clockOut}`
                                        : cell.summary.clockIn
                                          ? `${cell.summary.clockIn}–`
                                          : null}
                                      {cell.summary.jobCount > 0 ? (
                                        <div>¥{cell.summary.totalAmount.toLocaleString()} / {cell.summary.jobCount}件</div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">
                                  {canEdit ? "＋" : "－"}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ルーティン設定モーダル */}
      {routineTarget && (
        <RoutineModal
          open
          empId={routineTarget.empId}
          empName={routineTarget.empName}
          allRoutines={routines}
          customers={customers}
          onClose={() => setRoutineTarget(null)}
          onSaved={() => { setRoutineTarget(null); void loadRoutines() }}
        />
      )}

      {/* 日報詳細モーダル */}
      {reportTarget && (
        <DailyReportModal
          open
          empId={reportTarget.empId}
          empName={reportTarget.empName}
          date={reportTarget.date}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* 編集モーダル */}
      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-semibold">
              シフト編集
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {modal.shift_date} /{" "}
              {shiftData.employees.find((e) => e.emp_id === modal.emp_id)?.name ?? modal.emp_id}
            </p>

            <div className="space-y-4">
              {/* 休みフラグ */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={modal.is_day_off}
                  onChange={(e) =>
                    setModal((prev) => prev ? { ...prev, is_day_off: e.target.checked } : prev)
                  }
                  className="size-4 accent-primary"
                />
                <span className="text-sm font-medium">休日・休暇</span>
              </label>

              {/* 配置場所 */}
              <div className="space-y-1">
                <Label>配置場所</Label>
                <LocationPicker
                  value={modal.location}
                  onChange={(v) => setModal((prev) => prev ? { ...prev, location: v } : prev)}
                  customers={customers}
                  disabled={modal.is_day_off}
                />
              </div>

              {/* 作業内容 */}
              <div className="space-y-1">
                <Label htmlFor="shift-work-type">作業内容</Label>
                <Input
                  id="shift-work-type"
                  value={modal.work_type}
                  onChange={(e) =>
                    setModal((prev) => prev ? { ...prev, work_type: e.target.value } : prev)
                  }
                  disabled={modal.is_day_off}
                  placeholder="例: 配送、集荷"
                />
              </div>

              {/* 備考 */}
              <div className="space-y-1">
                <Label htmlFor="shift-note">備考</Label>
                <Input
                  id="shift-note"
                  value={modal.note}
                  onChange={(e) =>
                    setModal((prev) => prev ? { ...prev, note: e.target.value } : prev)
                  }
                  placeholder="任意"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? "保存中..." : "保存"}
              </Button>
              {modal.existing_id ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDelete()}
                  disabled={isSaving}
                >
                  削除
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => setModal(null)}
                disabled={isSaving}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
