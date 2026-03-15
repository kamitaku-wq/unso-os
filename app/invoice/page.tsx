import type { Metadata } from "next"

import InvoiceSwitcher from "./invoice-switcher"

export const metadata: Metadata = {
  title: "請求書 | 運送OS",
}

export default function InvoicePage() {
  return <InvoiceSwitcher />
}
