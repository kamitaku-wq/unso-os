"use client"

import { useEffect, useState } from "react"

import { BillablePanel } from "@/components/admin/billable-panel"
import { CleaningJobPanel } from "@/components/admin/cleaning-job-panel"
import { ClosingPanel } from "@/components/admin/closing-panel"
import { EmpRequestPanel } from "@/components/admin/emp-request-panel"
import { EmployeeManagementPanel } from "@/components/admin/employee-management-panel"
import { ExpenseClosingPanel } from "@/components/admin/expense-closing-panel"
import { ExpensePanel } from "@/components/admin/expense-panel"
import { InvitePanel } from "@/components/admin/invite-panel"
import { KpiSummaryBar } from "@/components/admin/kpi-summary-bar"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdminTab = "billables" | "cleaningJobs" | "expenses" | "closings" | "employees" | "empRequests" | "invite"

type PendingCounts = {
  billables: number
  expenses: number
  empRequests: number
}

type EnabledFeatures = Record<string, boolean>

// クエリ文字列から初期タブを安全に決める
function getAdminTabFromQuery(value: string | null): AdminTab | null {
  const map: Record<string, AdminTab> = {
    billables: "billables",
    cleaningJobs: "cleaningJobs",
    expenses: "expenses",
    closings: "closings",
    employees: "employees",
    empRequests: "empRequests",
    invite: "invite",
  }
  return value ? map[value] ?? null : null
}

// 未承認件数が最も多いタブを返す
function getDefaultTab(counts: PendingCounts, features: EnabledFeatures | null): AdminTab {
  if (features?.cleaning_job) return "cleaningJobs"

  const entries: [AdminTab, number][] = [
    ["billables", counts.billables],
    ["expenses", counts.expenses],
    ["empRequests", counts.empRequests],
  ]
  const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
  return max[1] > 0 ? max[0] : "billables"
}

// 管理者画面のタブ切り替えと各パネルの表示を担当するコンポーネント
export default function AdminPageClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>("billables")
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ billables: 0, expenses: 0, empRequests: 0 })
  const [features, setFeatures] = useState<EnabledFeatures | null>(null)
  const [ready, setReady] = useState(false)
  const [expenseMode, setExpenseMode] = useState<"closing" | "list">("closing")
  const [empNames, setEmpNames] = useState<Record<string, string>>({})
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const queryTab = getAdminTabFromQuery(params.get("tab"))

    const mePromise = fetch("/api/me")
      .then((r) => r.json())
      .then((data: { role?: string; custom_settings?: { enabled_features?: EnabledFeatures } }) => {
        const f = data.custom_settings?.enabled_features ?? null
        setFeatures(f)
        if (data.role) setRole(data.role)
        return f
      })
      .catch(() => null as EnabledFeatures | null)

    const countsPromise = fetch("/api/admin/pending-counts", { cache: "no-store" })
      .then((res) => res.json())
      .then((counts: PendingCounts) => { setPendingCounts(counts); return counts })
      .catch(() => ({ billables: 0, expenses: 0, empRequests: 0 }) as PendingCounts)

    // 社員名マップを取得する
    const empPromise = fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((data: { emp_id: string; name: string }[]) => {
        const map: Record<string, string> = {}
        if (Array.isArray(data)) data.forEach((e) => { map[e.emp_id] = e.name })
        setEmpNames(map)
      })
      .catch(() => {})

    void Promise.all([mePromise, countsPromise, empPromise]).then(([f, counts]) => {
      // URLパラメータのタブが現在の会社で有効な機能かチェック
      const isTabVisible = (tab: AdminTab) => {
        const featureMap: Partial<Record<AdminTab, string>> = {
          billables: "billable",
          cleaningJobs: "cleaning_job",
          expenses: "expense",
        }
        const key = featureMap[tab]
        if (!key || !f) return true
        return f[key] !== false
      }

      if (queryTab && isTabVisible(queryTab)) {
        setActiveTab(queryTab)
      } else {
        setActiveTab(getDefaultTab(counts, f))
      }
      setReady(true)
    })
  }, [])

  type TabItem = { value: AdminTab; label: string; badge?: number; featureKey?: string }

  const allTabs: TabItem[] = [
    { value: "billables", label: "運行実績", badge: pendingCounts.billables || undefined, featureKey: "billable" },
    { value: "cleaningJobs", label: "作業実績", featureKey: "cleaning_job" },
    { value: "expenses", label: "経費", badge: pendingCounts.expenses || undefined, featureKey: "expense" },
    { value: "closings", label: "月次締め" },
    { value: "employees", label: "社員一覧" },
    { value: "empRequests", label: "社員申請", badge: pendingCounts.empRequests || undefined },
    { value: "invite", label: "招待リンク" },
  ]

  const visibleTabs = features
    ? allTabs.filter((t) => !t.featureKey || features[t.featureKey] !== false)
    : allTabs

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">承認管理</h1>
          <p className="text-sm text-muted-foreground">
            管理者が実績と経費申請の承認作業を行う画面です。
          </p>
        </div>

        <KpiSummaryBar role={role} />

        {!ready ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <CardDescription>読み込み中...</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="gap-4">
                <div>
                  <CardTitle>管理対象</CardTitle>
                  <CardDescription>画面上部のタブで承認対象を切り替えます。</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleTabs.map(({ value, label, badge }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={activeTab === value ? "default" : "outline"}
                      onClick={() => setActiveTab(value)}
                    >
                      {label}
                      {badge !== undefined && badge > 0 && (
                        <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {badge}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardHeader>
            </Card>

            {activeTab === "billables" ? <BillablePanel /> : null}
            {activeTab === "cleaningJobs" ? <CleaningJobPanel /> : null}
            {activeTab === "expenses" ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button size="sm" variant={expenseMode === "closing" ? "default" : "outline"} onClick={() => setExpenseMode("closing")}>
                    締め期間ビュー
                  </Button>
                  <Button size="sm" variant={expenseMode === "list" ? "default" : "outline"} onClick={() => setExpenseMode("list")}>
                    一覧ビュー
                  </Button>
                </div>
                {expenseMode === "closing" ? <ExpenseClosingPanel empNames={empNames} /> : <ExpensePanel />}
              </div>
            ) : null}
            {activeTab === "closings" ? <ClosingPanel /> : null}
            {activeTab === "employees" ? <EmployeeManagementPanel /> : null}
            {activeTab === "empRequests" ? <EmpRequestPanel /> : null}
            {activeTab === "invite" ? <InvitePanel /> : null}
          </>
        )}
      </div>
    </main>
  )
}
