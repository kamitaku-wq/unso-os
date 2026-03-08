import type { Metadata } from "next"

import AttendancePageClient from "./attendance-page-client"

export const metadata: Metadata = {
  title: "勤怠管理 | 運送OS",
}

export default function AttendancePage() {
  return <AttendancePageClient />
}
