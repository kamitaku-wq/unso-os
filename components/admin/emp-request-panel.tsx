"use client"

import { useCallback, useEffect, useState } from "react"
import { Database } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableSkeleton } from "@/components/table-skeleton"
import { formatDateTime, getErrorMessage } from "@/lib/format"

type EmpRequest = {
  id: string
  request_id: string
  google_email: string
  name: string
  role_requested: string
  status: string
  submitted_at: string | null
  decided_at: string | null
  decided_by: string | null
  note: string | null
}

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

type PanelTab = "PENDING" | "REJECTED"

export function EmpRequestPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>("PENDING")
  const [requests, setRequests] = useState<EmpRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [processingKey, setProcessingKey] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<EmpRequest | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [rejectDialogError, setRejectDialogError] = useState("")
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  useEffect(() => {
    if (pageError) {
      toast.error(pageError)
    }
  }, [pageError])

  useEffect(() => {
    if (actionMessage) {
      toast.success(actionMessage)
    }
  }, [actionMessage])

  useEffect(() => {
    if (rejectDialogError) {
      toast.error(rejectDialogError)
    }
  }, [rejectDialogError])

  useEffect(() => {
    if (hasNoPermission) {
      toast.error("権限がありません")
    }
  }, [hasNoPermission])

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    setPageError("")

    try {
      const response = await fetch(`/api/admin/emp-requests?status=${activeTab}`, {
        cache: "no-store",
      })
      const data = (await response.json()) as EmpRequest[] | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setRequests([])
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "社員申請一覧の取得に失敗しました"))
      }

      setHasNoPermission(false)
      setRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "社員申請一覧の取得に失敗しました"
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  useEffect(() => {
    void loadRequests()
  }, [activeTab, loadRequests])

  const handleDelete = useCallback(
    async (request: EmpRequest) => {
      setProcessingKey(`delete:${request.id}`)
      setPageError("")
      setActionMessage("")
      try {
        const response = await fetch(`/api/admin/emp-requests/${request.id}`, {
          method: "DELETE",
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) {
          throw new Error(getErrorMessage(data, "削除に失敗しました"))
        }
        setActionMessage(`申請 ${request.request_id} を削除しました。`)
        await loadRequests()
      } catch (error) {
        const message = error instanceof Error ? error.message : "削除に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [loadRequests]
  )

  const handleApprove = useCallback(
    async (request: EmpRequest) => {
      setProcessingKey(`approve:${request.id}`)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/admin/emp-requests/${request.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "approve" }),
        })
        const data = (await response.json()) as { error?: string }

        if (response.status === 403) {
          setHasNoPermission(true)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "社員申請の承認に失敗しました"))
        }

        setActionMessage(`申請 ${request.request_id} を承認しました。`)
        await loadRequests()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "社員申請の承認に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [loadRequests]
  )

  const openRejectDialog = useCallback((request: EmpRequest) => {
    setSelectedRequest(request)
    setRejectNote("")
    setRejectDialogError("")
    setIsRejectDialogOpen(true)
  }, [])

  const handleReject = useCallback(async () => {
    if (!selectedRequest) return

    const note = rejectNote.trim()
    if (!note) {
      setRejectDialogError("却下理由を入力してください")
      return
    }

    setProcessingKey(`reject:${selectedRequest.id}`)
    setRejectDialogError("")
    setPageError("")
    setActionMessage("")

    try {
      const response = await fetch(`/api/admin/emp-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
          note,
        }),
      })
      const data = (await response.json()) as { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setIsRejectDialogOpen(false)
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "社員申請の却下に失敗しました"))
      }

      setActionMessage(`申請 ${selectedRequest.request_id} を却下しました。`)
      setIsRejectDialogOpen(false)
      setSelectedRequest(null)
      setRejectNote("")
      await loadRequests()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "社員申請の却下に失敗しました"
      setRejectDialogError(message)
    } finally {
      setProcessingKey("")
    }
  }, [loadRequests, rejectNote, selectedRequest])

  if (hasNoPermission) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            この画面を表示する権限がありません。
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>社員申請一覧</CardTitle>
              <CardDescription>
                {activeTab === "PENDING"
                  ? "承認待ちの申請を確認し、承認または却下します。"
                  : "却下済みの申請を確認・削除します。"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={activeTab === "PENDING" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("PENDING")}
              >
                承認待ち
              </Button>
              <Button
                type="button"
                variant={activeTab === "REJECTED" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("REJECTED")}
              >
                却下済み
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadRequests()} disabled={isLoading}>
                再読み込み
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={7} rows={4} />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={Database}
                description="上のフォームから最初の社員申請を登録してください"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申請日時</TableHead>
                      <TableHead>申請ID</TableHead>
                      <TableHead>氏名</TableHead>
                      <TableHead>メール</TableHead>
                      <TableHead>希望ロール</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => {
                      const isApproveProcessing = processingKey === `approve:${request.id}`
                      const isRejectProcessing = processingKey === `reject:${request.id}`

                      return (
                        <TableRow key={request.id}>
                          <TableCell>{formatDateTime(request.submitted_at)}</TableCell>
                          <TableCell>{request.request_id}</TableCell>
                          <TableCell>{request.name}</TableCell>
                          <TableCell>{request.google_email}</TableCell>
                          <TableCell>{request.role_requested}</TableCell>
                          <TableCell className="max-w-56 whitespace-normal">
                            {request.note || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {activeTab === "PENDING" ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void handleApprove(request)}
                                    disabled={!!processingKey}
                                  >
                                    {isApproveProcessing ? "承認中..." : "承認"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openRejectDialog(request)}
                                    disabled={!!processingKey}
                                  >
                                    {isRejectProcessing ? "却下中..." : "却下"}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void handleDelete(request)}
                                  disabled={!!processingKey}
                                >
                                  {processingKey === `delete:${request.id}` ? "削除中..." : "削除"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isRejectDialogOpen}
        onOpenChange={(open) => {
          if (processingKey) return

          setIsRejectDialogOpen(open)
          if (!open) {
            setSelectedRequest(null)
            setRejectNote("")
            setRejectDialogError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>却下理由を入力</DialogTitle>
            <DialogDescription>
              {selectedRequest
                ? `申請 ${selectedRequest.request_id} を却下します。理由を入力してください。`
                : "却下する申請を選択してください。"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-request-reject-note">却下理由</Label>
              <textarea
                id="emp-request-reject-note"
                className={TEXTAREA_CLASS}
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
                disabled={!!processingKey}
                placeholder="理由を入力してください"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false)
                setSelectedRequest(null)
                setRejectNote("")
                setRejectDialogError("")
              }}
              disabled={!!processingKey}
            >
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleReject()} disabled={!!processingKey}>
              {processingKey ? "送信中..." : "理由を保存して却下"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
