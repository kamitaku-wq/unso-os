// 作業実績の1行入力コンポーネント
import { Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/format"
import { type Entry, type Store, type WorkType, autoQtyFromIdList } from "./types"

export function EntryRow({ entry, idx, stores, works, total, onUpdate, onWorkChange, onRemove, disabled }: {
  entry: Entry
  idx: number
  stores: Store[]
  works: WorkType[]
  total: number
  onUpdate: (idx: number, patch: Partial<Entry>) => void
  onWorkChange: (idx: number, workCode: string) => void
  onRemove: (idx: number) => void
  disabled: boolean
}) {
  const qty = autoQtyFromIdList(entry.idList) ?? (parseInt(entry.qty, 10) || 0)
  const unitPrice = parseFloat(entry.unitPrice) || 0

  return (
    <div className="relative rounded-lg border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
        {total > 1 ? (
          <button type="button" onClick={() => onRemove(idx)} disabled={disabled}
            className="text-muted-foreground hover:text-destructive">
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={entry.store} onValueChange={(v) => onUpdate(idx, { store: v })} disabled={disabled}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="店舗" /></SelectTrigger>
          <SelectContent>
            {stores.map((s) => <SelectItem key={s.cust_id} value={s.cust_id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entry.work} onValueChange={(v) => onWorkChange(idx, v)} disabled={disabled}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="作業種別" /></SelectTrigger>
          <SelectContent>
            {works.map((w) => (
              <SelectItem key={w.work_code} value={w.work_code}>
                {w.name}{w.default_unit_price != null ? ` ¥${w.default_unit_price.toLocaleString()}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Input value={entry.carType} onChange={(e) => onUpdate(idx, { carType: e.target.value })}
          placeholder="車種（必須）" className="text-xs" disabled={disabled} />
        <Textarea value={entry.idList} onChange={(e) => onUpdate(idx, { idList: e.target.value })}
          placeholder="車両管理番号（1行1台、必須）" rows={2} className="text-xs" disabled={disabled} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">台数</Label>
          <Input type="number" min="1"
            value={autoQtyFromIdList(entry.idList) != null ? String(autoQtyFromIdList(entry.idList)) : entry.qty}
            onChange={(e) => onUpdate(idx, { qty: e.target.value })}
            disabled={disabled || autoQtyFromIdList(entry.idList) != null}
            className="text-xs" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">単価</Label>
          <Input type="number" min="0" value={entry.unitPrice}
            onChange={(e) => onUpdate(idx, { unitPrice: e.target.value })}
            disabled={disabled} className="text-xs" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">金額</Label>
          <div className="flex h-9 items-center rounded-md border bg-muted/30 px-2 text-xs font-medium">
            {formatCurrency(qty * unitPrice)}
          </div>
        </div>
      </div>

      <Input value={entry.note} onChange={(e) => onUpdate(idx, { note: e.target.value })}
        placeholder="備考（任意）" className="text-xs" disabled={disabled} />
    </div>
  )
}
