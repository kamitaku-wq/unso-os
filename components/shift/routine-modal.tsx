"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getErrorMessage } from "@/lib/format"

type RoutineDay = {
  day_of_week: number
  is_day_off: boolean
  location: string
  work_type: string
  note: string
}

type RoutineRow = {
  emp_id: string
  day_of_week: number
  is_day_off: boolean
  location: string | null
  work_type: string | null
  note: string | null
}

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]

function emptyWeek(): RoutineDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    is_day_off: false,
    location: "",
    work_type: "",
    note: "",
  }))
}

// ルーティン編集モーダル（従業員の曜日別テンプレートを設定する）
export function RoutineModal({
  open, empId, empName, allRoutines, onClose, onSaved,
}: {
  open: boolean
  empId: string
  empName: string
  allRoutines: RoutineRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [days, setDays] = useState<RoutineDay[]>(emptyWeek)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const week = emptyWeek()
    const empRoutines = allRoutines.filter(r => r.emp_id === empId)
    for (const r of empRoutines) {
      week[r.day_of_week] = {
        day_of_week: r.day_of_week,
        is_day_off: r.is_day_off,
        location: r.location ?? "",
        work_type: r.work_type ?? "",
        note: r.note ?? "",
      }
    }
    setDays(week)
  }, [open, empId, allRoutines])

  const updateDay = useCallback((idx: number, patch: Partial<RoutineDay>) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/shift/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_id: empId,
          routines: days.map(d => ({
            day_of_week: d.day_of_week,
            is_day_off: d.is_day_off,
            location: d.location || null,
            work_type: d.work_type || null,
            note: d.note || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, "保存に失敗しました"))
      toast.success(`${empName} のルーティンを保存しました`)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }, [empId, empName, days, onSaved])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ルーティン設定 - {empName}</DialogTitle>
          <DialogDescription>曜日ごとのデフォルトシフトを設定します。「適用」で現在の週に反映されます。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {days.map((day, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded border p-3">
              <div className="flex min-w-8 items-center pt-1">
                <span className={`text-sm font-medium ${idx >= 5 ? "text-blue-600" : ""}`}>{DAY_LABELS[idx]}</span>
              </div>
              <div className="flex-1 space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.is_day_off}
                    onChange={(e) => updateDay(idx, { is_day_off: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  <span className="text-xs">休み</span>
                </label>
                {!day.is_day_off && (
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">場所</Label>
                      <Input
                        value={day.location}
                        onChange={(e) => updateDay(idx, { location: e.target.value })}
                        placeholder="例: GS-春日井"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">作業</Label>
                      <Input
                        value={day.work_type}
                        onChange={(e) => updateDay(idx, { work_type: e.target.value })}
                        placeholder="例: 清掃"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>キャンセル</Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
