"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Users } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
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

type ShiftData = {
  shifts: ShiftRow[]
  employees: Employee[]
  role: Role | null
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

  useEffect(() => {
    void loadShifts(monday)
  }, [monday, loadShifts])

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
    if (!shift) return null
    if (shift.is_day_off) return { text: "休み", isDayOff: true }
    const parts = [shift.location, shift.work_type].filter(Boolean)
    return { text: parts.join(" / ") || "（内容未設定）", isDayOff: false }
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
            <div className="flex items-center justify-between">
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
                前の週
              </Button>
              <CardTitle className="text-base">
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
                次の週
                <ChevronRight className="size-4" />
              </Button>
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
                      <th className="sticky left-0 z-10 min-w-24 bg-muted/80 px-3 py-2 text-left font-medium text-muted-foreground">
                        社員
                      </th>
                      {weekDates.map((date, i) => (
                        <th
                          key={date}
                          className={[
                            "min-w-24 px-2 py-2 text-center font-medium",
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
                        <td className="sticky left-0 z-10 border-r bg-inherit px-3 py-2 font-medium">
                          {emp.name}
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
                                <span className={cell.isDayOff ? "text-xs" : "text-xs font-medium"}>
                                  {cell.text}
                                </span>
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
                <Label htmlFor="shift-location">配置場所</Label>
                <Input
                  id="shift-location"
                  value={modal.location}
                  onChange={(e) =>
                    setModal((prev) => prev ? { ...prev, location: e.target.value } : prev)
                  }
                  disabled={modal.is_day_off}
                  placeholder="例: 本社、A現場"
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
