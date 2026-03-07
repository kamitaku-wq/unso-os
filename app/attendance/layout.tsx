import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "勤怠管理 | 運送OS",
}

export default function AttendanceLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
