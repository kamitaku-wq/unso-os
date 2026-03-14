import type { Metadata } from "next"
import JobPageClient from "./job-page-client"

export const metadata: Metadata = {
  title: "日報",
}

export default function JobPage() {
  return <JobPageClient />
}
