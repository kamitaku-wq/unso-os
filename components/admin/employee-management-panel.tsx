"use client"

import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type EmployeeRole = "DRIVER" | "ADMIN" | "OWNER"

type Employee = {
  id: string
  emp_id: string
  name: string
  google_email: string
  role: EmployeeRole
  is_active: boolean
  created_at: string | null
}

function getErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error
  }

  return fallback
}

function formatDateTime(value: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString("ja-JP")
}

export function EmployeeManagementPanel() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [hasNoPermission, setHasNoPermission] = useState(false)
  const [processingKey, setProcessingKey] = useState("")

  const loadEmployees = useCallback(async () => {
    setIsLoading(true)
    setPageError("")

    try {
      const response = await fetch("/api/admin/employees", { cache: "no-store" })
      const data = (await response.json()) as Employee[] | { error?: string }

      if (response.status === 403) {
        setHasNoPermission(true)
        setEmployees([])
        return
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "社員一覧の取得に失敗しました"))
      }

      setHasNoPermission(false)
      setEmployees(Array.isArray(data) ? data : [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "社員一覧の取得に失敗しました"
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  const handleRoleChange = useCallback(
    async (employee: Employee, role: EmployeeRole) => {
      if (employee.role === role) return

      setProcessingKey(`role:${employee.id}`)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/admin/employees/${employee.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        })
        const data = (await response.json()) as { error?: string }

        if (response.status === 403) {
          setHasNoPermission(true)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "ロール変更に失敗しました"))
        }

        setActionMessage(`社員 ${employee.emp_id} のロールを ${role} に変更しました。`)
        await loadEmployees()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ロール変更に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [loadEmployees]
  )

  const handleDeactivate = useCallback(
    async (employee: Employee) => {
      const confirmed = window.confirm(
        `社員 ${employee.emp_id} を無効化します。よろしいですか？`
      )
      if (!confirmed) return

      setProcessingKey(`active:${employee.id}`)
      setPageError("")
      setActionMessage("")

      try {
        const response = await fetch(`/api/admin/employees/${employee.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: false }),
        })
        const data = (await response.json()) as { error?: string }

        if (response.status === 403) {
          setHasNoPermission(true)
          return
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "社員の無効化に失敗しました"))
        }

        setActionMessage(`社員 ${employee.emp_id} を無効化しました。`)
        await loadEmployees()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "社員の無効化に失敗しました"
        setPageError(message)
      } finally {
        setProcessingKey("")
      }
    },
    [loadEmployees]
  )

  if (hasNoPermission) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            権限がありません
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {pageError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>社員一覧</CardTitle>
            <CardDescription>
              ロール変更と在籍状態の管理を行います。
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadEmployees()} disabled={isLoading}>
            再読み込み
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-sm text-muted-foreground">読み込み中です...</div>
          ) : employees.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">
              表示できる社員データがありません。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>社員ID</TableHead>
                    <TableHead>氏名</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>ロール</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>登録日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const isRoleUpdating = processingKey === `role:${employee.id}`
                    const isActiveUpdating = processingKey === `active:${employee.id}`

                    return (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.emp_id}</TableCell>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>{employee.google_email}</TableCell>
                        <TableCell className="min-w-40">
                          <Select
                            value={employee.role}
                            onValueChange={(value) =>
                              void handleRoleChange(employee, value as EmployeeRole)
                            }
                            disabled={!!processingKey}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="ロールを選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRIVER">DRIVER</SelectItem>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                              <SelectItem value="OWNER">OWNER</SelectItem>
                            </SelectContent>
                          </Select>
                          {isRoleUpdating ? (
                            <p className="mt-2 text-xs text-muted-foreground">更新中...</p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.is_active ? "default" : "outline"}>
                            {employee.is_active ? "有効" : "無効"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(employee.created_at)}</TableCell>
                        <TableCell>
                          {employee.is_active ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleDeactivate(employee)}
                              disabled={!!processingKey}
                            >
                              {isActiveUpdating ? "更新中..." : "無効化"}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">無効</span>
                          )}
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
  )
}
