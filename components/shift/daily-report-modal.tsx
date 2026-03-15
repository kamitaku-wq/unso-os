"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, getErrorMessage } from "@/lib/format"

type JobDetail = {
  job_id: string
  store_name: string | null
  work_name: string | null
  car_type_text: string | null
  qty: number
  unit_price: number
  amount: number
  status: string
  id_list_raw: string | null
}

type AttendanceDetail = {
  clock_in: string | null
  clock_out: string | null
  work_min: number | null
  overtime_min: number | null
  status: string
}

type ReportData = {
  jobs: JobDetail[]
  attendance: AttendanceDetail | null
}

// 日報詳細モーダル（シフト表のサマリーをクリックで表示）
export function DailyReportModal({ open, empId, empName, date, onClose }: {
  open: boolean
  empId: string
  empName: string
  date: string
  onClose: () => void
}) {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!empId || !date) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/shift/daily-report?emp_id=${encodeURIComponent(empId)}&date=${date}`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(getErrorMessage(json, "取得に失敗しました"))
      setData(json)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [empId, date])

  useEffect(() => {
    if (open) void loadData()
  }, [open, loadData])

  const totalAmount = data?.jobs.reduce((s, j) => s + Number(j.amount ?? 0), 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>日報詳細 - {empName}</DialogTitle>
          <DialogDescription>{date}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : !data ? (
          <div className="py-8 text-center text-sm text-muted-foreground">データなし</div>
        ) : (
          <div className="space-y-4">
            {data.attendance ? (
              <div className="rounded border p-3 text-sm">
                <div className="font-medium mb-1">勤怠</div>
                <div className="flex gap-4 text-muted-foreground">
                  <span>出勤: {data.attendance.clock_in?.slice(11, 16) ?? "-"}</span>
                  <span>退勤: {data.attendance.clock_out?.slice(11, 16) ?? "-"}</span>
                  {data.attendance.work_min ? <span>勤務: {Math.round(data.attendance.work_min / 60 * 10) / 10}h</span> : null}
                  {data.attendance.overtime_min ? <span>残業: {Math.round(data.attendance.overtime_min / 60 * 10) / 10}h</span> : null}
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">作業実績 ({data.jobs.length}件)</span>
                <span className="font-medium text-sm">合計 {formatCurrency(totalAmount)}</span>
              </div>
              {data.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">作業実績なし</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>店舗</TableHead>
                        <TableHead>作業</TableHead>
                        <TableHead>車種</TableHead>
                        <TableHead className="text-right">台数</TableHead>
                        <TableHead className="text-right">単価</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                        <TableHead>状態</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.jobs.map((job) => (
                        <TableRow key={job.job_id}>
                          <TableCell className="whitespace-nowrap">{job.store_name ?? "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{job.work_name ?? "-"}</TableCell>
                          <TableCell className="max-w-24 whitespace-normal text-xs">{job.car_type_text ?? "-"}</TableCell>
                          <TableCell className="text-right">{job.qty}</TableCell>
                          <TableCell className="text-right">{formatCurrency(job.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(job.amount)}</TableCell>
                          <TableCell>
                            <StatusBadge status={job.status}>
                              {job.status === "APPROVED" ? "承認" : job.status === "REVIEW_REQUIRED" ? "未承認" : job.status}
                            </StatusBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
