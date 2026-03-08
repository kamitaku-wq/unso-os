import type { Metadata } from "next"

import MasterPageClient from "./master-page-client"

export const metadata: Metadata = {
  title: "マスタ管理 | 運送OS",
}

export default function MasterPage() {
  return <MasterPageClient />
}
