import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "経費申請 | 運送OS",
}

export default function ExpenseLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
