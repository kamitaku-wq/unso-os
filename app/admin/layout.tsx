import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "管理者画面 | 運送OS",
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
