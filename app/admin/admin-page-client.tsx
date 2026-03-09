"use client"

import { useEffect, useState } from "react"

import { BillablePanel } from "@/components/admin/billable-panel"
import { ClosingPanel } from "@/components/admin/closing-panel"
import { EmpRequestPanel } from "@/components/admin/emp-request-panel"
import { EmployeeManagementPanel } from "@/components/admin/employee-management-panel"
import { ExpensePanel } from "@/components/admin/expense-panel"
import { InvitePanel } from "@/components/admin/invite-panel"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdminTab = "billables" | "expenses" | "closings" | "employees" | "empRequests" | "invite"

type PendingCounts = {
  billables: number
  expenses: number
  empRequests: number
}

// クエリ文字列から初期タブを安全に決める
function getAdminTabFromQuery(value: string | null): AdminTab {
  if (value === "expenses") return "expenses"
  if (value === "closings") return "closings"
  if (value === "employees") return "employees"
  if (value === "empRequests") return "empRequests"
  if (value === "invite") return "invite"
  return "billables"
}

// 未承認件数が最も多いタブを返す（ない場合は billables）
function getDefaultTab(counts: PendingCounts): AdminTab {
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const queryTab = params.get("tab")

    // クエリパラメータで指定があればそれを優先、なければ未承認件数が最も多いタブを自動選択
    void fetch("/api/admin/pending-counts", { cache: "no-store" })
      .then((res) => res.json())
      .then((counts: PendingCounts) => {
        setPendingCounts(counts)
        if (!queryTab) {
          setActiveTab(getDefaultTab(counts))
        } else {
          setActiveTab(getAdminTabFromQuery(queryTab))
        }
      })
      .catch(() => {
        setActiveTab(getAdminTabFromQuery(queryTab))
      })
  }, [])

  const tabConfig: { value: AdminTab; label: string; badge?: number }[] = [
    { value: "billables", label: "運行実績", badge: pendingCounts.billables || undefined },
    { value: "expenses", label: "経費", badge: pendingCounts.expenses || undefined },
    { value: "closings", label: "月次締め" },
    { value: "employees", label: "社員一覧" },
    { value: "empRequests", label: "社員申請", badge: pendingCounts.empRequests || undefined },
    { value: "invite", label: "招待リンク" },
  ]

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">承認管理</h1>
          <p className="text-sm text-muted-foreground">
            管理者が運行実績と経費申請の承認作業を行う画面です。
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>管理対象</CardTitle>
              <CardDescription>画面上部のタブで承認対象を切り替えます。</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabConfig.map(({ value, label, badge }) => (
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
        {activeTab === "expenses" ? <ExpensePanel /> : null}
        {activeTab === "closings" ? <ClosingPanel /> : null}
        {activeTab === "employees" ? <EmployeeManagementPanel /> : null}
        {activeTab === "empRequests" ? <EmpRequestPanel /> : null}
        {activeTab === "invite" ? <InvitePanel /> : null}
      </div>
    </main>
  )
}
