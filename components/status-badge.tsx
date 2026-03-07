import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

const STATUS_BADGE_CLASSNAME: Record<string, string> = {
  REVIEW_REQUIRED: "border-yellow-400 bg-yellow-50 text-yellow-700",
  SUBMITTED: "border-yellow-400 bg-yellow-50 text-yellow-700",
  PENDING: "border-yellow-400 bg-yellow-50 text-yellow-700",
  APPROVED: "border-green-400 bg-green-50 text-green-700",
  REJECTED: "border-red-400 bg-red-50 text-red-700",
  VOID: "border-red-400 bg-red-50 text-red-700",
  PAID: "border-blue-400 bg-blue-50 text-blue-700",
  REWORK_REQUIRED: "border-orange-400 bg-orange-50 text-orange-700",
}

export function StatusBadge({
  status,
  children,
}: {
  status: string
  children: ReactNode
}) {
  return (
    <Badge variant="outline" className={STATUS_BADGE_CLASSNAME[status]}>
      {children}
    </Badge>
  )
}
