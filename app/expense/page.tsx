import type { Metadata } from "next"

import ExpensePageClient from "./expense-page-client"

export const metadata: Metadata = {
  title: "経費申請 | 運送OS",
}

export default function ExpensePage() {
  return <ExpensePageClient />
}
