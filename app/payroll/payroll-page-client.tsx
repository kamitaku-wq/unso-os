"use client"

import { useCallback, useEffect, useState } from "react"
import { Calculator, Settings } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { formatCurrency, getErrorMessage } from "@/lib/format"

// ---- 型定義 ----

type PayType = "MONTHLY" | "HOURLY"
type PayrollStatus = "DRAFT" | "CONFIRMED" | "PAID"

type SalarySetting = {
  id: string
  emp_id: string
  emp_name: string
  pay_type: PayType
  basic_monthly: number | null
  hourly_wage: number | null
  overtime_rate: number
  transport_allowance: number
  standard_work_hours: number
  note: string | null
}

type Payroll = {
  id: string
  emp_id: string
  emp_name: string
  ym: string
  basic_pay: number
  overtime_pay: number
  transport_allowance: number
  expense_reimbursement: number
  gross_pay: number
  work_hours: number
  overtime_hours: number
  status: PayrollStatus
  note: string | null
  confirmed_at: string | null
  paid_at: string | null
}

type Employee = {
  emp_id: string
  name: string
}

type ApiError = { error?: string }

// ---- ユーティリティ ----

function getCurrentYm() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatYmLabel(ym: string) {
  if (!/^\d{6}$/.test(ym)) return ym
  return `${ym.slice(0, 4)} 年 ${ym.slice(4, 6)} 月`
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init })
  const data = (await res.json()) as T | ApiError
  if (!res.ok) throw new Error(getErrorMessage(data, "操作に失敗しました"))
  return data as T
}

// ---- ステータスバッジ ----

const STATUS_CONFIG: Record<PayrollStatus, { label: string; className: string }> = {
  DRAFT: { label: "計算済み（未確定）", className: "border-yellow-400 bg-yellow-50 text-yellow-800" },
  CONFIRMED: { label: "確定済み", className: "border-blue-400 bg-blue-50 text-blue-800" },
  PAID: { label: "支払済み", className: "border-emerald-400 bg-emerald-50 text-emerald-800" },
}

function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}

// ---- 給与設定ダイアログ ----

function SettingDialog({
  open,
  onClose,
  initial,
  employees,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: SalarySetting | null
  employees: Employee[]
  onSaved: () => void
}) {
  const [empId, setEmpId] = useState(initial?.emp_id ?? "")
  const [payType, setPayType] = useState<PayType>(initial?.pay_type ?? "MONTHLY")
  const [basicMonthly, setBasicMonthly] = useState(String(initial?.basic_monthly ?? ""))
  const [hourlyWage, setHourlyWage] = useState(String(initial?.hourly_wage ?? ""))
  const [overtimeRate, setOvertimeRate] = useState(String(initial?.overtime_rate ?? "1.25"))
  const [transportAllowance, setTransportAllowance] = useState(String(initial?.transport_allowance ?? "0"))
  const [standardWorkHours, setStandardWorkHours] = useState(String(initial?.standard_work_hours ?? "160"))
  const [note, setNote] = useState(initial?.note ?? "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setEmpId(initial?.emp_id ?? "")
      setPayType(initial?.pay_type ?? "MONTHLY")
      setBasicMonthly(String(initial?.basic_monthly ?? ""))
      setHourlyWage(String(initial?.hourly_wage ?? ""))
      setOvertimeRate(String(initial?.overtime_rate ?? "1.25"))
      setTransportAllowance(String(initial?.transport_allowance ?? "0"))
      setStandardWorkHours(String(initial?.standard_work_hours ?? "160"))
      setNote(initial?.note ?? "")
    }
  }, [open, initial])

  async function handleSave() {
    if (!empId) { toast.error("社員を選択してください"); return }
    if (payType === "MONTHLY" && !basicMonthly) { toast.error("月給を入力してください"); return }
    if (payType === "HOURLY" && !hourlyWage) { toast.error("時給を入力してください"); return }

    setIsSaving(true)
    try {
      await requestJson("/api/payroll/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_id: empId,
          pay_type: payType,
          basic_monthly: payType === "MONTHLY" ? Number(basicMonthly) : null,
          hourly_wage: payType === "HOURLY" ? Number(hourlyWage) : null,
          overtime_rate: Number(overtimeRate),
          transport_allowance: Number(transportAllowance),
          standard_work_hours: Number(standardWorkHours),
          note: note.trim() || null,
        }),
      })
      toast.success("給与設定を保存しました")
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "給与設定を編集" : "給与設定を追加"}</DialogTitle>
          <DialogDescription>社員の給与計算に使う設定を登録します。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>社員</Label>
            <Select value={empId} onValueChange={setEmpId} disabled={!!initial}>
              <SelectTrigger><SelectValue placeholder="社員を選択" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.emp_id} value={e.emp_id}>{e.name} ({e.emp_id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>給与形態</Label>
            <Select value={payType} onValueChange={(v) => setPayType(v as PayType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">月給制</SelectItem>
                <SelectItem value="HOURLY">時給制</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {payType === "MONTHLY" ? (
            <div className="space-y-2">
              <Label htmlFor="basic-monthly">月給（円）</Label>
              <Input id="basic-monthly" type="number" min="0" value={basicMonthly} onChange={e => setBasicMonthly(e.target.value)} placeholder="例: 250000" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="hourly-wage">時給（円）</Label>
              <Input id="hourly-wage" type="number" min="0" value={hourlyWage} onChange={e => setHourlyWage(e.target.value)} placeholder="例: 1200" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overtime-rate">残業割増率</Label>
              <Input id="overtime-rate" type="number" step="0.01" min="1" value={overtimeRate} onChange={e => setOvertimeRate(e.target.value)} placeholder="1.25" />
              <p className="text-xs text-muted-foreground">法定: 1.25（25% 増）</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transport">交通費（月額・円）</Label>
              <Input id="transport" type="number" min="0" value={transportAllowance} onChange={e => setTransportAllowance(e.target.value)} placeholder="0" />
            </div>
          </div>

          {payType === "MONTHLY" && (
            <div className="space-y-2">
              <Label htmlFor="std-hours">月の所定労働時間（h）</Label>
              <Input id="std-hours" type="number" min="1" value={standardWorkHours} onChange={e => setStandardWorkHours(e.target.value)} placeholder="160" />
              <p className="text-xs text-muted-foreground">残業単価 = 月給 ÷ 所定労働時間 × 割増率</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="setting-note">備考</Label>
            <Input id="setting-note" value={note} onChange={e => setNote(e.target.value)} placeholder="任意" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>キャンセル</Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- メインページ ----

export default function PayrollPageClient() {
  const [activeTab, setActiveTab] = useState<"payroll" | "settings">("payroll")
  const [selectedYm, setSelectedYm] = useState(getCurrentYm())
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [settings, setSettings] = useState<SalarySetting[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [editTarget, setEditTarget] = useState<SalarySetting | null>(null)
  const [showSettingDialog, setShowSettingDialog] = useState(false)

  // 給与一覧を取得する
  const loadPayrolls = useCallback(async (ym: string) => {
    setIsLoading(true)
    try {
      const data = await requestJson<Payroll[]>(`/api/payroll?ym=${ym}`)
      setPayrolls(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 給与設定一覧を取得する
  const loadSettings = useCallback(async () => {
    try {
      const [settingsData, empData] = await Promise.all([
        requestJson<SalarySetting[]>("/api/payroll/settings"),
        requestJson<{ emp_id: string; name: string }[]>("/api/admin/employees")
          .then(data => data.map(e => ({ emp_id: e.emp_id, name: e.name })))
          .catch(() => [] as Employee[]),
      ])
      setSettings(settingsData)
      setEmployees(empData)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "設定の取得に失敗しました")
    }
  }, [])

  useEffect(() => {
    void loadPayrolls(selectedYm)
    void loadSettings()
  }, [loadPayrolls, loadSettings, selectedYm])

  // 給与一括計算
  async function handleCalculate() {
    setIsBusy(true)
    try {
      const data = await requestJson<Payroll[]>("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ym: selectedYm }),
      })
      setPayrolls(data)
      toast.success(`${formatYmLabel(selectedYm)} の給与を計算しました（${data.length} 件）`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "計算に失敗しました")
    } finally {
      setIsBusy(false)
    }
  }

  // ステータス更新
  async function handleStatusUpdate(id: string, status: "CONFIRMED" | "PAID") {
    setIsBusy(true)
    try {
      await requestJson(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      await loadPayrolls(selectedYm)
      const label = status === "CONFIRMED" ? "確定" : "支払済みに変更"
      toast.success(`給与を${label}しました`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました")
    } finally {
      setIsBusy(false)
    }
  }

  // 一括確定（全 DRAFT を CONFIRMED に）
  async function handleBulkConfirm() {
    const drafts = payrolls.filter(p => p.status === "DRAFT")
    if (drafts.length === 0) { toast.error("確定できる給与がありません"); return }
    setIsBusy(true)
    try {
      await Promise.all(drafts.map(p =>
        requestJson(`/api/payroll/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED" }),
        })
      ))
      await loadPayrolls(selectedYm)
      toast.success(`${drafts.length} 件の給与を一括確定しました`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "一括確定に失敗しました")
    } finally {
      setIsBusy(false)
    }
  }

  // 前月・翌月ナビ
  function shiftMonth(delta: number) {
    const year = Number(selectedYm.slice(0, 4))
    const month = Number(selectedYm.slice(4, 6)) + delta
    const d = new Date(year, month - 1, 1)
    setSelectedYm(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const draftCount = payrolls.filter(p => p.status === "DRAFT").length
  const totalGross = payrolls.reduce((s, p) => s + p.gross_pay, 0)

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* ページヘッダー */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">給与管理</h1>
          <p className="text-sm text-muted-foreground">
            勤怠データをもとに給与を自動計算し、確定・支払い管理を行います。
          </p>
        </div>

        {/* タブ切り替え */}
        <div className="flex gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
          {(["payroll", "settings"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab === "payroll" ? <Calculator className="size-4" /> : <Settings className="size-4" />}
              {tab === "payroll" ? "給与計算" : "給与設定"}
            </button>
          ))}
        </div>

        {/* ===== 給与計算タブ ===== */}
        {activeTab === "payroll" && (
          <div className="space-y-6">
            {/* 月選択 + 操作ボタン */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>対象月の選択</CardTitle>
                    <CardDescription>月を選択して給与計算を実行します。</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)} disabled={isBusy}>◀</Button>
                      <span className="min-w-32 text-center font-semibold">{formatYmLabel(selectedYm)}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)} disabled={isBusy}>▶</Button>
                    </div>
                    <Button type="button" onClick={() => void handleCalculate()} disabled={isBusy || settings.length === 0}>
                      {isBusy ? "計算中..." : "一括計算"}
                    </Button>
                    {draftCount > 0 && (
                      <Button type="button" variant="outline" onClick={() => void handleBulkConfirm()} disabled={isBusy}>
                        一括確定（{draftCount} 件）
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* サマリーカード */}
            {payrolls.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-l-4 border-l-blue-400 bg-blue-50/60">
                  <CardContent className="px-5 pb-4 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">支給総額</p>
                    <p className="mt-2 text-2xl font-bold text-blue-900">{formatCurrency(totalGross)}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-slate-300 bg-slate-50/60">
                  <CardContent className="px-5 pb-4 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">対象人数</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{payrolls.length} 名</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-400 bg-emerald-50/60">
                  <CardContent className="px-5 pb-4 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">支払済み</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-900">
                      {payrolls.filter(p => p.status === "PAID").length} 名
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 給与一覧テーブル */}
            <Card>
              <CardHeader>
                <CardTitle>{formatYmLabel(selectedYm)} 給与台帳</CardTitle>
                <CardDescription>
                  勤怠データ（承認済み）をもとに計算した給与の一覧です。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableSkeleton columns={8} rows={4} />
                ) : payrolls.length === 0 ? (
                  <EmptyState
                    icon={Calculator}
                    description="「一括計算」ボタンを押すと給与が自動計算されます。事前に給与設定タブで社員ごとの設定を登録してください。"
                  />
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>社員名</TableHead>
                          <TableHead className="text-right">勤務時間</TableHead>
                          <TableHead className="text-right">残業時間</TableHead>
                          <TableHead className="text-right">基本給</TableHead>
                          <TableHead className="text-right">残業代</TableHead>
                          <TableHead className="text-right">交通費</TableHead>
                          <TableHead className="text-right">支給総額</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrolls.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="font-medium">{p.emp_name}</div>
                              <div className="text-xs text-muted-foreground">{p.emp_id}</div>
                            </TableCell>
                            <TableCell className="text-right">{p.work_hours} h</TableCell>
                            <TableCell className="text-right text-orange-700">{p.overtime_hours} h</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.basic_pay)}</TableCell>
                            <TableCell className="text-right text-orange-700">
                              {p.overtime_pay > 0 ? formatCurrency(p.overtime_pay) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.transport_allowance > 0 ? formatCurrency(p.transport_allowance) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              {formatCurrency(p.gross_pay)}
                            </TableCell>
                            <TableCell>
                              <PayrollStatusBadge status={p.status} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {p.status === "DRAFT" && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => void handleStatusUpdate(p.id, "CONFIRMED")}
                                  >
                                    確定
                                  </Button>
                                )}
                                {p.status === "CONFIRMED" && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => void handleStatusUpdate(p.id, "PAID")}
                                  >
                                    支払済み
                                  </Button>
                                )}
                                {p.status === "PAID" && (
                                  <span className="text-xs text-muted-foreground">完了</span>
                                )}
                              </div>
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
        )}

        {/* ===== 給与設定タブ ===== */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>社員別給与設定</CardTitle>
                  <CardDescription>
                    給与形態（月給制・時給制）、基本給、残業割増率、交通費を社員ごとに設定します。
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={() => { setEditTarget(null); setShowSettingDialog(true) }}
                >
                  設定を追加
                </Button>
              </CardHeader>
              <CardContent>
                {settings.length === 0 ? (
                  <EmptyState
                    icon={Settings}
                    description="「設定を追加」から社員ごとの給与設定を登録してください。"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>社員名</TableHead>
                        <TableHead>給与形態</TableHead>
                        <TableHead className="text-right">基本給</TableHead>
                        <TableHead className="text-right">残業率</TableHead>
                        <TableHead className="text-right">交通費</TableHead>
                        <TableHead>備考</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settings.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.emp_name}</div>
                            <div className="text-xs text-muted-foreground">{s.emp_id}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {s.pay_type === "MONTHLY" ? "月給制" : "時給制"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {s.pay_type === "MONTHLY"
                              ? formatCurrency(s.basic_monthly ?? 0)
                              : `${(s.hourly_wage ?? 0).toLocaleString()} 円/h`}
                          </TableCell>
                          <TableCell className="text-right">{s.overtime_rate}×</TableCell>
                          <TableCell className="text-right">
                            {s.transport_allowance > 0 ? formatCurrency(s.transport_allowance) : "-"}
                          </TableCell>
                          <TableCell className="max-w-40 truncate text-muted-foreground">
                            {s.note || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditTarget(s); setShowSettingDialog(true) }}
                            >
                              編集
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <SettingDialog
        open={showSettingDialog}
        onClose={() => setShowSettingDialog(false)}
        initial={editTarget}
        employees={employees}
        onSaved={() => void loadSettings()}
      />
    </main>
  )
}
