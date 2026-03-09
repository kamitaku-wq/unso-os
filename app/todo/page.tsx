import type { Metadata } from "next"
import { TodoPageClient } from "./todo-page-client"

export const metadata: Metadata = {
  title: "Todo | 運送OS",
}

export default function TodoPage() {
  return <TodoPageClient />
}
