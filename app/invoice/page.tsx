import type { Metadata } from "next"

import InvoicePageClient from "./invoice-page-client"

export const metadata: Metadata = {
  title: "請求書 | 運送OS",
}

export default function InvoicePage() {
  return <InvoicePageClient />
}
