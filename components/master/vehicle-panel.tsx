"use client"

import { useCallback, useEffect, useState } from "react"
import { Database } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getErrorMessage } from "@/lib/format"

type Vehicle = {
  id: string
  vehicle_id: string
  name: string
  plate_no: string | null
  vehicle_type: string | null
  capacity_ton: number | null
  is_active: boolean
  memo: string | null
}

type VehicleForm = {
  vehicle_id: string
  name: string
  plate_no: string
  vehicle_type: string
  capacity_ton: string
  memo: string
}

type ApiError = {
  error?: string
}

type DeleteIntent = {
  id: string
  label: string
  path: string
}

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

const initialVehicleForm: VehicleForm = {
  vehicle_id: "",
  name: "",
  plate_no: "",
  vehicle_type: "",
  capacity_ton: "",
  memo: "",
}

// 積載量を表示用文字列に変換する
function formatCapacity(value: number | null) {
  if (value === null) return "-"
  return `${value}t`
}

// 車両の稼働状態を日本語表示に変換する
function getVehicleStatusLabel(isActive: boolean) {
  return isActive ? "稼働中" : "停止"
}

// 共通の JSON API 呼び出しを行う
async function requestJson<T>(
  input: string,
  init: RequestInit | undefined,
  fallbackMessage: string
) {
  const response = await fetch(input, { cache: "no-store", ...init })
  const data = (await response.json()) as T | ApiError
  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallbackMessage))
  }
  return data as T
}

// 車両マスタの一覧表示・登録・編集・削除・稼働状態切替を担当するパネルコンポーネント
export function VehiclePanel() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(initialVehicleForm)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<DeleteIntent | null>(null)

  const isMutating = busyKey !== null

  // 車両一覧を取得する
  const loadVehicles = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await requestJson<Vehicle[]>(
        "/api/master/vehicles",
        undefined,
        "車両一覧の取得に失敗しました"
      )
      setVehicles(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "車両一覧の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVehicles()
  }, [loadVehicles])

  // 車両新規登録を行う
  const handleCreateVehicle = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setBusyKey("create-vehicle")
      try {
        await requestJson<{ ok: true }>(
          "/api/master/vehicles",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vehicle_id: vehicleForm.vehicle_id.trim(),
              name: vehicleForm.name.trim(),
              plate_no: vehicleForm.plate_no.trim(),
              vehicle_type: vehicleForm.vehicle_type.trim(),
              capacity_ton: vehicleForm.capacity_ton.trim(),
              memo: vehicleForm.memo.trim(),
            }),
          },
          "車両の登録に失敗しました"
        )
        setVehicleForm(initialVehicleForm)
        toast.success("車両を登録しました。")
        await loadVehicles()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "車両の登録に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [vehicleForm, loadVehicles]
  )

  // 車両更新を行う
  const handleUpdateVehicle = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!editingVehicle) return
      setBusyKey(`update-vehicle-${editingVehicle.id}`)
      try {
        await requestJson<{ ok: true }>(
          `/api/master/vehicles/${editingVehicle.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vehicle_id: editingVehicle.vehicle_id.trim(),
              name: editingVehicle.name.trim(),
              plate_no: (editingVehicle.plate_no ?? "").trim(),
              vehicle_type: (editingVehicle.vehicle_type ?? "").trim(),
              capacity_ton: (editingVehicle.capacity_ton?.toString() ?? "").trim(),
              memo: (editingVehicle.memo ?? "").trim(),
            }),
          },
          "車両の更新に失敗しました"
        )
        setEditingVehicle(null)
        toast.success("車両を更新しました。")
        await loadVehicles()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "車両の更新に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [editingVehicle, loadVehicles]
  )

  // 車両の稼働状態を切り替える
  const handleToggleVehicleStatus = useCallback(
    async (vehicle: Vehicle) => {
      setBusyKey(`toggle-vehicle-${vehicle.id}`)
      try {
        await requestJson<{ ok: true }>(
          `/api/master/vehicles/${vehicle.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: !vehicle.is_active }),
          },
          "車両の稼働状態更新に失敗しました"
        )
        toast.success(`車両を${!vehicle.is_active ? "稼働中" : "停止"}に変更しました。`)
        await loadVehicles()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "車両の稼働状態更新に失敗しました")
      } finally {
        setBusyKey(null)
      }
    },
    [loadVehicles]
  )

  // 車両削除を行う
  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    setBusyKey(`delete-vehicle-${pendingDelete.id}`)
    try {
      await requestJson<{ ok: true }>(
        pendingDelete.path,
        { method: "DELETE" },
        "車両の削除に失敗しました"
      )
      setPendingDelete(null)
      toast.success("車両を削除しました。")
      await loadVehicles()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "車両の削除に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }, [pendingDelete, loadVehicles])

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>車両の新規登録</CardTitle>
            <CardDescription>
              車両コードと名称は必須です。その他は任意で登録できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateVehicle}>
              <div className="space-y-2">
                <Label htmlFor="vehicle-code">車両コード</Label>
                <Input
                  id="vehicle-code"
                  value={vehicleForm.vehicle_id}
                  onChange={(e) =>
                    setVehicleForm((c) => ({ ...c, vehicle_id: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-name">名称</Label>
                <Input
                  id="vehicle-name"
                  value={vehicleForm.name}
                  onChange={(e) =>
                    setVehicleForm((c) => ({ ...c, name: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-plate">ナンバー</Label>
                <Input
                  id="vehicle-plate"
                  value={vehicleForm.plate_no}
                  onChange={(e) =>
                    setVehicleForm((c) => ({ ...c, plate_no: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-type">種別</Label>
                <Input
                  id="vehicle-type"
                  value={vehicleForm.vehicle_type}
                  onChange={(e) =>
                    setVehicleForm((c) => ({ ...c, vehicle_type: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-capacity">積載量（トン）</Label>
                <Input
                  id="vehicle-capacity"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={vehicleForm.capacity_ton}
                  onChange={(e) =>
                    setVehicleForm((c) => ({ ...c, capacity_ton: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-memo">メモ</Label>
                <textarea
                  id="vehicle-memo"
                  className={TEXTAREA_CLASS}
                  value={vehicleForm.memo}
                  onChange={(e) =>
                    setVehicleForm((c) => ({ ...c, memo: e.target.value }))
                  }
                  disabled={isLoading || isMutating}
                  placeholder="任意"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isMutating}
              >
                {busyKey === "create-vehicle" ? "登録中..." : "車両を登録"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>車両一覧</CardTitle>
            <CardDescription>
              {isLoading ? "最新データを表示します。" : `${vehicles.length}件を表示しています。`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={8} rows={4} />
            ) : vehicles.length === 0 ? (
              <EmptyState
                icon={Database}
                description="上のフォームから最初の車両を登録してください"
              />
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden whitespace-nowrap sm:table-cell">車両コード</TableHead>
                    <TableHead className="whitespace-nowrap">名称</TableHead>
                    <TableHead className="hidden md:table-cell">ナンバー</TableHead>
                    <TableHead className="hidden md:table-cell">種別</TableHead>
                    <TableHead className="hidden lg:table-cell">積載量</TableHead>
                    <TableHead className="whitespace-nowrap">稼働状態</TableHead>
                    <TableHead className="hidden lg:table-cell">メモ</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="hidden sm:table-cell">{vehicle.vehicle_id}</TableCell>
                      <TableCell className="whitespace-nowrap">{vehicle.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{vehicle.plate_no || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{vehicle.vehicle_type || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatCapacity(vehicle.capacity_ton)}</TableCell>
                      <TableCell>
                        <Badge variant={vehicle.is_active ? "default" : "outline"}>
                          {getVehicleStatusLabel(vehicle.is_active)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden max-w-72 whitespace-normal lg:table-cell">
                        {vehicle.memo || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isMutating}
                            onClick={() => void handleToggleVehicleStatus(vehicle)}
                          >
                            {busyKey === `toggle-vehicle-${vehicle.id}`
                              ? "更新中..."
                              : vehicle.is_active
                                ? "停止にする"
                                : "稼働中にする"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isMutating}
                            onClick={() => setEditingVehicle(vehicle)}
                          >
                            編集
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isMutating}
                            onClick={() =>
                              setPendingDelete({
                                id: vehicle.id,
                                label: `車両「${vehicle.name}」`,
                                path: `/api/master/vehicles/${vehicle.id}`,
                              })
                            }
                          >
                            {busyKey === `delete-vehicle-${vehicle.id}` ? "削除中..." : "削除"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editingVehicle !== null}
        onOpenChange={(open) => { if (!open) setEditingVehicle(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>車両を編集</DialogTitle>
            <DialogDescription>
              車両情報を更新できます。稼働状態は一覧のボタンから切り替えます。
            </DialogDescription>
          </DialogHeader>
          {editingVehicle ? (
            <form className="space-y-4" onSubmit={handleUpdateVehicle}>
              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-id">車両コード</Label>
                <Input
                  id="edit-vehicle-id"
                  value={editingVehicle.vehicle_id}
                  onChange={(e) =>
                    setEditingVehicle((c) => c ? { ...c, vehicle_id: e.target.value } : c)
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-name">名称</Label>
                <Input
                  id="edit-vehicle-name"
                  value={editingVehicle.name}
                  onChange={(e) =>
                    setEditingVehicle((c) => c ? { ...c, name: e.target.value } : c)
                  }
                  disabled={isMutating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-plate">ナンバー</Label>
                <Input
                  id="edit-vehicle-plate"
                  value={editingVehicle.plate_no ?? ""}
                  onChange={(e) =>
                    setEditingVehicle((c) => c ? { ...c, plate_no: e.target.value } : c)
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-type">種別</Label>
                <Input
                  id="edit-vehicle-type"
                  value={editingVehicle.vehicle_type ?? ""}
                  onChange={(e) =>
                    setEditingVehicle((c) => c ? { ...c, vehicle_type: e.target.value } : c)
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-capacity">積載量（トン）</Label>
                <Input
                  id="edit-vehicle-capacity"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={editingVehicle.capacity_ton?.toString() ?? ""}
                  onChange={(e) =>
                    setEditingVehicle((c) =>
                      c
                        ? { ...c, capacity_ton: e.target.value ? Number(e.target.value) : null }
                        : c
                    )
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vehicle-memo">メモ</Label>
                <textarea
                  id="edit-vehicle-memo"
                  className={TEXTAREA_CLASS}
                  value={editingVehicle.memo ?? ""}
                  onChange={(e) =>
                    setEditingVehicle((c) => c ? { ...c, memo: e.target.value } : c)
                  }
                  disabled={isMutating}
                  placeholder="任意"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingVehicle(null)}
                  disabled={isMutating}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {busyKey?.startsWith("update-vehicle-") ? "更新中..." : "更新する"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.label} を削除すると元に戻せません。`
                : "削除すると元に戻せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={(e) => { e.preventDefault(); void handleDelete() }}
            >
              {isMutating ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
