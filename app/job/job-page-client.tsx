"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ClipboardList, Plus } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, getErrorMessage } from "@/lib/format"

type Role = "WORKER" | "ADMIN" | "OWNER"
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

// 現在の YYYYMM を返す
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

export default function JobPageClient() {
  const [ym, setYm] = useState(currentYm)
  const [jobs, setJobs] = useState<Job[]>([])
  const [works, setWorks] = useState<WorkType[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // フォーム状態
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formStore, setFormStore] = useState("")
  const [formWork, setFormWork] = useState("")
  const [formCarType, setFormCarType] = useState("")
  const [formIdList, setFormIdList] = useState("")
  const [formQty, setFormQty] = useState("1")
  const [formUnitPrice, setFormUnitPrice] = useState("")
  const [formNote, setFormNote] = useState("")

  const canApprove = role === "ADMIN" || role === "OWNER"

  // データ取得
  const loadData = useCallback(async (targetYm: string) => {
    setIsLoading(true)
    try {
      const [jobsData, meData] = await Promise.all([
        fetchJson<Job[]>(`/api/cleaning-job?ym=${targetYm}`),
        fetchJson<{ role: Role }>("/api/me"),
      ])
      setJobs(jobsData)
      setRole(meData.role)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

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

  useEffect(() => {
    void loadData(ym)
  }, [ym, loadData])

  // 作業種別選択時に単価を自動セット
  function handleWorkChange(workCode: string) {
    setFormWork(workCode)
    const work = works.find((w) => w.work_code === workCode)
    if (work?.default_unit_price != null) {
      setFormUnitPrice(String(work.default_unit_price))
    }
  }

  // ID一覧から台数を自動計算
  const autoQty = useMemo(() => {
    if (!formIdList.trim()) return null
    const lines = formIdList.trim().split(/\n/).filter(Boolean)
    return lines.length
  }, [formIdList])

  // 登録
  async function handleSubmit() {
    const store = stores.find((s) => s.cust_id === formStore)
    const work = works.find((w) => w.work_code === formWork)
    if (!store || !work) {
      toast.error("店舗と作業種別を選択してください")
      return
    }
    const qty = autoQty ?? parseInt(formQty, 10)
    const unitPrice = parseFloat(formUnitPrice)
    if (!qty || qty <= 0 || isNaN(unitPrice)) {
      toast.error("台数と単価を入力してください")
      return
    }

    setIsSaving(true)
    try {
      await fetchJson("/api/cleaning-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_date: formDate,
          store_id: formStore,
          store_name: store.name,
          work_code: formWork,
          work_name: work.name,
          car_type_text: formCarType || null,
          id_list_raw: formIdList.trim() || null,
          qty,
          unit_price: unitPrice,
          price_note: formNote || null,
        }),
      })
      toast.success("作業実績を登録しました")
      setShowForm(false)
      resetForm()
      await loadData(ym)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "登録に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  function resetForm() {
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormStore("")
    setFormWork("")
    setFormCarType("")
    setFormIdList("")
    setFormQty("1")
    setFormUnitPrice("")
    setFormNote("")
  }

  // 承認・VOID
  async function handleAction(id: string, action: "approve" | "void") {
    try {
      await fetchJson(`/api/cleaning-job/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      toast.success(action === "approve" ? "承認しました" : "VOID にしました")
      await loadData(ym)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作に失敗しました")
    }
  }

  const totalAmount = jobs
    .filter((j) => j.status !== "VOID")
    .reduce((sum, j) => sum + j.amount, 0)

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">作業実績</h1>
            <p className="text-sm text-muted-foreground">清掃作業の実績を登録・管理します。</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 size-4" />
            {showForm ? "閉じる" : "新規登録"}
          </Button>
        </div>

        {/* 入力フォーム */}
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>作業実績を登録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>作業日</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>店舗</Label>
                  <Select value={formStore} onValueChange={setFormStore}>
                    <SelectTrigger><SelectValue placeholder="店舗を選択" /></SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.cust_id} value={s.cust_id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>作業種別</Label>
                  <Select value={formWork} onValueChange={handleWorkChange}>
                    <SelectTrigger><SelectValue placeholder="作業種別を選択" /></SelectTrigger>
                    <SelectContent>
                      {works.map((w) => (
                        <SelectItem key={w.work_code} value={w.work_code}>
                          {w.name}{w.default_unit_price != null ? ` (¥${w.default_unit_price.toLocaleString()})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>車種</Label>
                  <Input value={formCarType} onChange={(e) => setFormCarType(e.target.value)} placeholder="例: プリウス" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>車両管理番号（1行に1つ、10桁）</Label>
                <Textarea
                  value={formIdList}
                  onChange={(e) => setFormIdList(e.target.value)}
                  placeholder={"1234567890\n0987654321"}
                  rows={4}
                />
                {autoQty != null ? (
                  <p className="text-xs text-muted-foreground">{autoQty} 台検出</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>台数</Label>
                  <Input
                    type="number"
                    min="1"
                    value={autoQty != null ? String(autoQty) : formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    disabled={autoQty != null}
                  />
                </div>
                <div className="space-y-1">
                  <Label>単価（円）</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>金額</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
                    {formatCurrency(((autoQty !== null ? autoQty : parseInt(formQty, 10)) || 0) * (parseFloat(formUnitPrice) || 0))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label>備考</Label>
                <Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="任意" />
              </div>

              <Button onClick={() => void handleSubmit()} disabled={isSaving} className="w-full">
                {isSaving ? "登録中..." : "登録する"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* 月切り替え + 一覧 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setYm(shiftYm(ym, -1))}>
                <ChevronLeft className="size-4" /> 前月
              </Button>
              <CardTitle className="text-base">{ymLabel(ym)}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setYm(shiftYm(ym, 1))}>
                次月 <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={7} rows={5} />
            ) : jobs.length === 0 ? (
              <EmptyState icon={ClipboardList} description="この月の作業実績はありません" />
            ) : (
              <>
                <div className="mb-3 text-right text-sm font-medium text-muted-foreground">
                  合計: <span className="text-foreground">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日付</TableHead>
                        <TableHead>店舗</TableHead>
                        <TableHead>作業</TableHead>
                        <TableHead className="text-right">台数</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                        <TableHead>状態</TableHead>
                        {canApprove ? <TableHead>操作</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id} className={job.status === "VOID" ? "opacity-50" : ""}>
                          <TableCell className="whitespace-nowrap">{job.work_date}</TableCell>
                          <TableCell>{job.store_name}</TableCell>
                          <TableCell>
                            {job.work_name}
                            {job.car_type_text ? <span className="ml-1 text-xs text-muted-foreground">({job.car_type_text})</span> : null}
                          </TableCell>
                          <TableCell className="text-right">{job.qty}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(job.amount)}</TableCell>
                          <TableCell><StatusBadge status={job.status}>{job.status}</StatusBadge></TableCell>
                          {canApprove ? (
                            <TableCell>
                              <div className="flex gap-1">
                                {job.status === "REVIEW_REQUIRED" ? (
                                  <Button size="sm" variant="outline" onClick={() => void handleAction(job.id, "approve")}>承認</Button>
                                ) : null}
                                {job.status !== "VOID" ? (
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void handleAction(job.id, "void")}>VOID</Button>
                                ) : null}
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
