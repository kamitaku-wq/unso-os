"use client"

import { useCallback, useEffect, useState } from "react"
import { Database } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { TableSkeleton } from "@/components/table-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/format"

type Work = {
  id: string
  work_code: string
  name: string
  default_unit_price: number | null
  is_active: boolean
  note: string | null
}

type WorkForm = {
  work_code: string
  name: string
  default_unit_price: string
  note: string
}

const initialForm: WorkForm = { work_code: "", name: "", default_unit_price: "", note: "" }

// 作業種別マスタの一覧表示・登録・編集を担当するパネルコンポーネント
export function WorksPanel() {
  const [works, setWorks] = useState<Work[]>([])
  const [form, setForm] = useState<WorkForm>(initialForm)
  const [editing, setEditing] = useState<Work | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isMutating = busyKey !== null

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/master/works", { cache: "no-store" })
      if (!res.ok) throw new Error("取得に失敗しました")
      setWorks(await res.json())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setBusyKey("create")
    try {
      const res = await fetch("/api/master/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_code: form.work_code.trim(),
          name: form.name.trim(),
          default_unit_price: form.default_unit_price ? Number(form.default_unit_price) : null,
          note: form.note.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(getErrorMessage(data, "登録に失敗しました"))
      }
      setForm(initialForm)
      toast.success("作業種別を登録しました。")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "登録に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }, [form, load])

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setBusyKey(`update-${editing.id}`)
    try {
      const res = await fetch("/api/master/works", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: editing.name.trim(),
          default_unit_price: editing.default_unit_price,
          is_active: editing.is_active,
          note: editing.note?.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(getErrorMessage(data, "更新に失敗しました"))
      }
      setEditing(null)
      toast.success("作業種別を更新しました。")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }, [editing, load])

  const formatPrice = (p: number | null) => p != null ? `¥${p.toLocaleString()}` : "—"

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>作業種別の新規登録</CardTitle>
            <CardDescription>作業コードと名称は必須です。単価は任意です。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="work-code">作業コード</Label>
                <Input id="work-code" value={form.work_code}
                  onChange={(e) => setForm((f) => ({ ...f, work_code: e.target.value }))}
                  disabled={isLoading || isMutating} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-name">名称</Label>
                <Input id="work-name" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={isLoading || isMutating} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-price">デフォルト単価</Label>
                <Input id="work-price" type="number" value={form.default_unit_price}
                  onChange={(e) => setForm((f) => ({ ...f, default_unit_price: e.target.value }))}
                  disabled={isLoading || isMutating} placeholder="任意" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-note">備考</Label>
                <Input id="work-note" value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  disabled={isLoading || isMutating} placeholder="任意" />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isMutating}>
                {busyKey === "create" ? "登録中..." : "登録"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>作業種別一覧</CardTitle>
            <CardDescription>
              {isLoading ? "読み込み中..." : `${works.length}件を表示しています。`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columns={5} rows={4} />
            ) : works.length === 0 ? (
              <EmptyState icon={Database} description="左のフォームから最初の作業種別を登録してください" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>コード</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="text-right">単価</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {works.map((w) => (
                    <TableRow key={w.id} className={w.is_active ? "" : "opacity-50"}>
                      <TableCell>{w.work_code}</TableCell>
                      <TableCell>{w.name}</TableCell>
                      <TableCell className="text-right">{formatPrice(w.default_unit_price)}</TableCell>
                      <TableCell>{w.is_active ? "有効" : "無効"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="outline" disabled={isMutating}
                          onClick={() => setEditing(w)}>
                          編集
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>作業種別を編集</DialogTitle>
            <DialogDescription>名称・単価・有効/無効を変更できます。コードは変更できません。</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form className="space-y-4" onSubmit={handleUpdate}>
              <div className="space-y-2">
                <Label>作業コード</Label>
                <Input value={editing.work_code} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-work-name">名称</Label>
                <Input id="edit-work-name" value={editing.name}
                  onChange={(e) => setEditing((w) => w ? { ...w, name: e.target.value } : w)}
                  disabled={isMutating} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-work-price">デフォルト単価</Label>
                <Input id="edit-work-price" type="number" value={editing.default_unit_price ?? ""}
                  onChange={(e) => setEditing((w) => w ? { ...w, default_unit_price: e.target.value ? Number(e.target.value) : null } : w)}
                  disabled={isMutating} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-work-note">備考</Label>
                <Input id="edit-work-note" value={editing.note ?? ""}
                  onChange={(e) => setEditing((w) => w ? { ...w, note: e.target.value } : w)}
                  disabled={isMutating} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-work-active" checked={editing.is_active}
                  onChange={(e) => setEditing((w) => w ? { ...w, is_active: e.target.checked } : w)}
                  disabled={isMutating} />
                <Label htmlFor="edit-work-active">有効</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={isMutating}>キャンセル</Button>
                <Button type="submit" disabled={isMutating}>
                  {busyKey?.startsWith("update-") ? "更新中..." : "更新する"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
