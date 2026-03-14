import type { Metadata } from "next"
import JobPageClient from "./job-page-client"

export const metadata: Metadata = {
  title: "作業実績 | 運送OS",
}

export default function JobPage() {
  return <JobPageClient />
}
