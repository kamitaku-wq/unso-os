import type { Metadata } from "next"

import PayrollPageClient from "./payroll-page-client"

export const metadata: Metadata = {
  title: "給与管理 | 運送OS",
}

export default function PayrollPage() {
  return <PayrollPageClient />
}
