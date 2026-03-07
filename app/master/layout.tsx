import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "マスタ管理 | 運送OS",
}

export default function MasterLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
