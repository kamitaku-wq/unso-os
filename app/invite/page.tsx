import type { Metadata } from "next"

import InvitePageClient from "./invite-page-client"

export const metadata: Metadata = {
  title: "招待 | 運送OS",
}

export default function InvitePage() {
  return <InvitePageClient />
}
