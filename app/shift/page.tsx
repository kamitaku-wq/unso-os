import type { Metadata } from "next"

import ShiftPageClient from "./shift-page-client"

export const metadata: Metadata = {
  title: "シフト管理 | 運送OS",
}

export default function ShiftPage() {
  return <ShiftPageClient />
}
