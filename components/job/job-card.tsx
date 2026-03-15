// モバイル向けジョブカード表示
import { StatusBadge } from "@/components/status-badge"
import { formatCurrency } from "@/lib/format"
import type { Job } from "./types"

export function JobCard({ job }: { job: Job }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${job.status === "VOID" ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{job.work_name}</span>
          <StatusBadge status={job.status}>
            {job.status === "APPROVED" ? "承認" : job.status === "VOID" ? "無効" : "待ち"}
          </StatusBadge>
        </div>
        <div className="text-xs text-muted-foreground">
          {job.work_date} · {job.store_name}
          {job.car_type_text ? ` · ${job.car_type_text}` : ""}
          {` · ${job.qty}台`}
        </div>
      </div>
      <div className="shrink-0 text-right font-medium">{formatCurrency(job.amount)}</div>
    </div>
  )
}
