"use client"

import { useEffect, useState } from "react"

import { CustomerPanel } from "@/components/master/customer-panel"
import { ExpenseCategoryPanel } from "@/components/master/expense-category-panel"
import { RatecardPanel } from "@/components/master/ratecard-panel"
import { RoutePanel } from "@/components/master/route-panel"
import { VehiclePanel } from "@/components/master/vehicle-panel"
import { WorksPanel } from "@/components/master/works-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type MasterTab = "customers" | "routes" | "expenseCategories" | "vehicles" | "ratecards" | "works"

type TabDef = {
  value: MasterTab
  label: string
  featureKey?: string
}

type EnabledFeatures = Record<string, boolean>

// マスタ管理画面のタブ切り替えと各パネルのレンダリングを担当するクライアントコンポーネント
export default function MasterPageClient() {
  const [activeTab, setActiveTab] = useState<MasterTab>("customers")
  const [features, setFeatures] = useState<EnabledFeatures | null>(null)

  // enabled_features を /api/me から取得する
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { custom_settings?: { enabled_features?: EnabledFeatures } }) => {
        setFeatures(data.custom_settings?.enabled_features ?? null)
      })
      .catch(() => {})
  }, [])

  const allTabs: TabDef[] = [
    { value: "customers", label: features?.cleaning_job ? "客先" : "荷主" },
    { value: "works", label: "作業種別", featureKey: "cleaning_job" },
    { value: "routes", label: "ルート", featureKey: "billable" },
    { value: "expenseCategories", label: "経費区分" },
    { value: "vehicles", label: "車両", featureKey: "billable" },
    { value: "ratecards", label: "運賃", featureKey: "billable" },
  ]

  // features 未設定 → 全表示、featureKey 未定義 → 常に表示
  const visibleTabs = features
    ? allTabs.filter((t) => !t.featureKey || features[t.featureKey] !== false)
    : allTabs

  const description = features?.cleaning_job
    ? "客先・作業種別・経費区分をタブで切り替えて登録、編集、削除できます。"
    : "荷主・ルート・経費区分・車両をタブで切り替えて登録、編集、削除できます。"

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">マスタ管理</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>管理対象</CardTitle>
              <CardDescription>
                画面上部のタブで対象マスタを切り替えます。
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleTabs.map((tab) => (
                <Button
                  key={tab.value}
                  type="button"
                  variant={activeTab === tab.value ? "default" : "outline"}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </CardHeader>
        </Card>

        {activeTab === "customers" ? <CustomerPanel labelPrefix={features?.cleaning_job ? "客先" : "荷主"} /> : null}
        {activeTab === "works" ? <WorksPanel /> : null}
        {activeTab === "routes" ? <RoutePanel /> : null}
        {activeTab === "expenseCategories" ? <ExpenseCategoryPanel /> : null}
        {activeTab === "vehicles" ? <VehiclePanel /> : null}
        {activeTab === "ratecards" ? <RatecardPanel /> : null}
      </div>
    </main>
  )
}
