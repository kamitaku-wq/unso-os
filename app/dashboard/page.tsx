import type { Metadata } from "next"

import DashboardPageClient from "./dashboard-page-client"

export const metadata: Metadata = {
  title: "経営ダッシュボード | 運送OS",
}

export default function DashboardPage() {
  return <DashboardPageClient />
}
