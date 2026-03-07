import type { Metadata } from "next"

import HomePageClient from "@/app/home-page-client"

export const metadata: Metadata = {
  title: "運行実績入力 | 運送OS",
}

export default function Home() {
  return <HomePageClient />
}
