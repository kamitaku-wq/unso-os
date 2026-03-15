// 勤怠入力フォーム
import { useState } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getErrorMessage } from "@/lib/format"

export function AttendanceForm({ formDate }: { formDate: string }) {
  const [clockIn, setClockIn] = useState("08:00")
  const [clockOut, setClockOut] = useState("17:00")
  const [breakMin, setBreakMin] = useState("60")
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit() {
    setIsSaving(true)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_date: formDate,
          clock_in: `${formDate}T${clockIn}:00`,
          clock_out: `${formDate}T${clockOut}:00`,
          break_min: parseInt(breakMin, 10) || 0,
          drive_min: null,
          note: null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(data, "勤怠の登録に失敗しました"))
      toast.success("勤怠を登録しました")
      setSaved(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "勤怠の登録に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">勤怠</CardTitle>
      </CardHeader>
      <CardContent>
        {saved ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="size-4" /> 登録済み
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">出勤</Label>
                <Input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">退勤</Label>
                <Input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">休憩(分)</Label>
                <Input type="number" min="0" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} />
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => void handleSubmit()} disabled={isSaving}>
              勤怠を登録
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
