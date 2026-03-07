import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "請求書管理 | 運送OS",
}

export default function InvoiceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
