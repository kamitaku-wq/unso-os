"use client"

import { useState } from "react"

import { CustomerPanel } from "@/components/master/customer-panel"
import { ExpenseCategoryPanel } from "@/components/master/expense-category-panel"
import { RatecardPanel } from "@/components/master/ratecard-panel"
import { RoutePanel } from "@/components/master/route-panel"
import { VehiclePanel } from "@/components/master/vehicle-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type MasterTab = "customers" | "routes" | "expenseCategories" | "vehicles" | "ratecards"

// マスタ管理画面のタブ切り替えと各パネルのレンダリングを担当するクライアントコンポーネント
export default function MasterPageClient() {
  const [activeTab, setActiveTab] = useState<MasterTab>("customers")

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">マスタ管理</h1>
          <p className="text-sm text-muted-foreground">
            荷主・ルート・経費区分・車両をタブで切り替えて登録、編集、削除できます。
          </p>
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
              <Button
                type="button"
                variant={activeTab === "customers" ? "default" : "outline"}
                onClick={() => setActiveTab("customers")}
              >
                荷主
              </Button>
              <Button
                type="button"
                variant={activeTab === "routes" ? "default" : "outline"}
                onClick={() => setActiveTab("routes")}
              >
                ルート
              </Button>
              <Button
                type="button"
                variant={activeTab === "expenseCategories" ? "default" : "outline"}
                onClick={() => setActiveTab("expenseCategories")}
              >
                経費区分
              </Button>
              <Button
                type="button"
                variant={activeTab === "vehicles" ? "default" : "outline"}
                onClick={() => setActiveTab("vehicles")}
              >
                車両
              </Button>
              <Button
                type="button"
                variant={activeTab === "ratecards" ? "default" : "outline"}
                onClick={() => setActiveTab("ratecards")}
              >
                運賃
              </Button>
            </div>
          </CardHeader>
        </Card>

        {activeTab === "customers" ? <CustomerPanel /> : null}
        {activeTab === "routes" ? <RoutePanel /> : null}
        {activeTab === "expenseCategories" ? <ExpenseCategoryPanel /> : null}
        {activeTab === "vehicles" ? <VehiclePanel /> : null}
        {activeTab === "ratecards" ? <RatecardPanel /> : null}
      </div>
    </main>
  )
}
