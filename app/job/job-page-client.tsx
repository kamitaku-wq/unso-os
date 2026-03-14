"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, ClipboardList, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, getErrorMessage } from "@/lib/format"

type WorkType = {
  id: string
  work_code: string
  name: string
  default_unit_price: number | null
  is_active: boolean
}
type Store = { cust_id: string; name: string }
type Job = {
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
  id_list_raw: string | null
  price_note: string | null
}

// 空のエントリ行を作る
function emptyEntry() {
  return { store: "", work: "", carType: "", idList: "", qty: "1", unitPrice: "", note: "" }
}
type Entry = ReturnType<typeof emptyEntry>

function currentYm(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
}

function ymLabel(ym: string): string {
  return `${ym.slice(0, 4)}年${parseInt(ym.slice(4), 10)}月`
}

function shiftYm(ym: string, delta: number): string {
  const y = parseInt(ym.slice(0, 4), 10)
  const m = parseInt(ym.slice(4), 10) + delta
  const date = new Date(y, m - 1, 1)
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init })
  const data = (await res.json()) as T | { error?: string }
  if (!res.ok) throw new Error(getErrorMessage(data, "通信エラー"))
  return data as T
}

// ID一覧から台数を自動計算する
function autoQtyFromIdList(idList: string): number | null {
  if (!idList.trim()) return null
  return idList.trim().split(/\n/).filter(Boolean).length
}

// 日報スタイルの作業実績入力画面
export default function JobPageClient() {
  const [ym, setYm] = useState(currentYm)
  const [jobs, setJobs] = useState<Job[]>([])
  const [works, setWorks] = useState<WorkType[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 日報入力状態
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState<Entry[]>([emptyEntry()])
  const [isSaving, setIsSaving] = useState(false)

  // 勤怠入力
  const [clockIn, setClockIn] = useState("08:00")
  const [clockOut, setClockOut] = useState("17:00")
  const [breakMin, setBreakMin] = useState("60")
  const [attendanceSaved, setAttendanceSaved] = useState(false)

  // 登録済み件数（連続入力のフィードバック）
  const [savedCount, setSavedCount] = useState(0)

  // マスタ取得（初回のみ）
  useEffect(() => {
    Promise.all([
      fetchJson<WorkType[]>("/api/master/works"),
      fetchJson<Store[]>("/api/master/customers"),
    ]).then(([w, s]) => {
      setWorks(w.filter((x) => x.is_active))
      setStores(s)
    }).catch(() => {})
  }, [])

  // 月別データ取得
  const loadJobs = useCallback(async (targetYm: string) => {
    setIsLoading(true)
    try {
      setJobs(await fetchJson<Job[]>(`/api/cleaning-job?ym=${targetYm}`))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadJobs(ym) }, [ym, loadJobs])

  // エントリ更新ヘルパー
  function updateEntry(idx: number, patch: Partial<Entry>) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }

  // 作業種別選択時に単価を自動セット
  function handleWorkChange(idx: number, workCode: string) {
    const work = works.find((w) => w.work_code === workCode)
    updateEntry(idx, {
      work: workCode,
      unitPrice: work?.default_unit_price != null ? String(work.default_unit_price) : "",
    })
  }

  // 行追加（前の行の店舗と作業種別を引き継ぎ）
  function addEntry() {
    const last = entries[entries.length - 1]
    const inherited = { ...emptyEntry(), store: last?.store ?? "", work: last?.work ?? "" }
    // 引き継いだ作業種別の単価もセット
    if (inherited.work) {
      const w = works.find((x) => x.work_code === inherited.work)
      if (w?.default_unit_price != null) inherited.unitPrice = String(w.default_unit_price)
    }
    setEntries((prev) => [...prev, inherited])
  }

  // 行削除
  function removeEntry(idx: number) {
    if (entries.length <= 1) return
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  // 作業実績を一括登録
  async function handleSubmitJobs() {
    const validEntries = entries.filter((e) => e.store && e.work)
    if (validEntries.length === 0) {
      toast.error("作業内容を1つ以上入力してください")
      return
    }

    setIsSaving(true)
    let successCount = 0
    for (const entry of validEntries) {
      const store = stores.find((s) => s.cust_id === entry.store)
      const work = works.find((w) => w.work_code === entry.work)
      if (!store || !work) continue

      if (!entry.carType.trim()) {
        toast.error(`${work.name}: 車種を入力してください`)
        setIsSaving(false)
        return
      }
      if (!entry.idList.trim()) {
        toast.error(`${work.name}: 車両管理番号を入力してください`)
        setIsSaving(false)
        return
      }
      const qty = autoQtyFromIdList(entry.idList) ?? parseInt(entry.qty, 10)
      const unitPrice = parseFloat(entry.unitPrice)
      if (!qty || qty <= 0 || isNaN(unitPrice)) {
        toast.error(`${work.name}: 台数と単価を入力してください`)
        setIsSaving(false)
        return
      }

      try {
        await fetchJson("/api/cleaning-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            work_date: formDate,
            store_id: entry.store,
            store_name: store.name,
            work_code: entry.work,
            work_name: work.name,
            car_type_text: entry.carType || null,
            id_list_raw: entry.idList.trim() || null,
            qty,
            unit_price: unitPrice,
            price_note: entry.note || null,
          }),
        })
        successCount++
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "登録に失敗しました")
        setIsSaving(false)
        return
      }
    }

    setSavedCount((c) => c + successCount)
    toast.success(`${successCount}件の作業実績を登録しました`)
    // フォームをリセットして次の入力へ（店舗は引き継ぎ）
    const lastStore = entries[entries.length - 1]?.store ?? ""
    setEntries([{ ...emptyEntry(), store: lastStore }])
    setIsSaving(false)
    await loadJobs(ym)
  }

  // 勤怠を登録
  async function handleSubmitAttendance() {
    setIsSaving(true)
    try {
      await fetchJson("/api/attendance", {
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
      toast.success("勤怠を登録しました")
      setAttendanceSaved(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "勤怠の登録に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  const totalAmount = useMemo(
    () => jobs.filter((j) => j.status !== "VOID").reduce((sum, j) => sum + j.amount, 0),
    [jobs]
  )

  const todayJobs = useMemo(
    () => jobs.filter((j) => j.work_date === formDate && j.status !== "VOID"),
    [jobs, formDate]
  )

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-6 md:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">

        {/* ヘッダー：日付選択 */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">日報</h1>
          <div className="flex items-center gap-3">
            <Label className="shrink-0 text-sm">作業日</Label>
            <Input
              type="date"
              value={formDate}
              onChange={(e) => { setFormDate(e.target.value); setAttendanceSaved(false); setSavedCount(0) }}
              className="max-w-48"
            />
          </div>
          {todayJobs.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              この日の登録済み: {todayJobs.length}件（{formatCurrency(todayJobs.reduce((s, j) => s + j.amount, 0))}）
            </p>
          ) : null}
        </div>

        {/* 勤怠セクション */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">勤怠</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceSaved ? (
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
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleSubmitAttendance()}
                  disabled={isSaving}
                >
                  勤怠を登録
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 作業実績入力セクション */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">作業実績</CardTitle>
              {savedCount > 0 ? (
                <span className="text-xs text-green-600">{savedCount}件登録済み</span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {entries.map((entry, idx) => (
              <EntryRow
                key={idx}
                entry={entry}
                idx={idx}
                stores={stores}
                works={works}
                total={entries.length}
                onUpdate={updateEntry}
                onWorkChange={handleWorkChange}
                onRemove={removeEntry}
                disabled={isSaving}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addEntry}
              disabled={isSaving}
            >
              <Plus className="mr-1 size-4" /> 行を追加
            </Button>

            <Button
              className="w-full"
              onClick={() => void handleSubmitJobs()}
              disabled={isSaving || entries.every((e) => !e.store || !e.work)}
            >
              {isSaving ? "登録中..." : `作業実績を登録（${entries.filter((e) => e.store && e.work).length}件）`}
            </Button>
          </CardContent>
        </Card>

        {/* 月別一覧 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setYm(shiftYm(ym, -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <CardTitle className="text-base">{ymLabel(ym)}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setYm(shiftYm(ym, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">読み込み中...</p>
            ) : jobs.length === 0 ? (
              <EmptyState icon={ClipboardList} description="この月の作業実績はありません" />
            ) : (
              <>
                <div className="mb-2 text-right text-sm font-medium text-muted-foreground">
                  合計: <span className="text-foreground">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// 作業実績の1行入力コンポーネント
function EntryRow({ entry, idx, stores, works, total, onUpdate, onWorkChange, onRemove, disabled }: {
  entry: Entry
  idx: number
  stores: Store[]
  works: WorkType[]
  total: number
  onUpdate: (idx: number, patch: Partial<Entry>) => void
  onWorkChange: (idx: number, workCode: string) => void
  onRemove: (idx: number) => void
  disabled: boolean
}) {
  const qty = autoQtyFromIdList(entry.idList) ?? (parseInt(entry.qty, 10) || 0)
  const unitPrice = parseFloat(entry.unitPrice) || 0

  return (
    <div className="relative rounded-lg border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
        {total > 1 ? (
          <button type="button" onClick={() => onRemove(idx)} disabled={disabled}
            className="text-muted-foreground hover:text-destructive">
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={entry.store} onValueChange={(v) => onUpdate(idx, { store: v })} disabled={disabled}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="店舗" /></SelectTrigger>
          <SelectContent>
            {stores.map((s) => <SelectItem key={s.cust_id} value={s.cust_id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entry.work} onValueChange={(v) => onWorkChange(idx, v)} disabled={disabled}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="作業種別" /></SelectTrigger>
          <SelectContent>
            {works.map((w) => (
              <SelectItem key={w.work_code} value={w.work_code}>
                {w.name}{w.default_unit_price != null ? ` ¥${w.default_unit_price.toLocaleString()}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Input
          value={entry.carType}
          onChange={(e) => onUpdate(idx, { carType: e.target.value })}
          placeholder="車種（必須）"
          className="text-xs"
          disabled={disabled}
        />
        <Textarea
          value={entry.idList}
          onChange={(e) => onUpdate(idx, { idList: e.target.value })}
          placeholder="車両管理番号（1行1台、必須）"
          rows={2}
          className="text-xs"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">台数</Label>
          <Input
            type="number" min="1"
            value={autoQtyFromIdList(entry.idList) != null ? String(autoQtyFromIdList(entry.idList)) : entry.qty}
            onChange={(e) => onUpdate(idx, { qty: e.target.value })}
            disabled={disabled || autoQtyFromIdList(entry.idList) != null}
            className="text-xs"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">単価</Label>
          <Input
            type="number" min="0"
            value={entry.unitPrice}
            onChange={(e) => onUpdate(idx, { unitPrice: e.target.value })}
            disabled={disabled}
            className="text-xs"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">金額</Label>
          <div className="flex h-9 items-center rounded-md border bg-muted/30 px-2 text-xs font-medium">
            {formatCurrency(qty * unitPrice)}
          </div>
        </div>
      </div>

      <Input
        value={entry.note}
        onChange={(e) => onUpdate(idx, { note: e.target.value })}
        placeholder="備考（任意）"
        className="text-xs"
        disabled={disabled}
      />
    </div>
  )
}

// モバイル向けジョブカード表示
function JobCard({ job }: { job: Job }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${job.status === "VOID" ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{job.work_name}</span>
          <StatusBadge status={job.status}>
            {job.status === "APPROVED" ? "承認" : job.status === "VOID" ? "無効" : "待ち"}
          </StatusBadge>
        </div>
        <div className="text-xs text-muted-foreground">
          {job.work_date} · {job.store_name}
          {job.car_type_text ? ` · ${job.car_type_text}` : ""}
          {` · ${job.qty}台`}
        </div>
      </div>
      <div className="shrink-0 text-right font-medium">{formatCurrency(job.amount)}</div>
    </div>
  )
}
