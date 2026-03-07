import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "経営ダッシュボード | 運送OS",
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
