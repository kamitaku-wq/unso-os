import type { Metadata } from "next"

import AdminPageClient from "./admin-page-client"

export const metadata: Metadata = {
  title: "管理 | 運送OS",
}

export default function AdminPage() {
  return <AdminPageClient />
}
