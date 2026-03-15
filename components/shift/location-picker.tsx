"use client"

import { useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"

type CustomerOption = { cust_id: string; name: string }

// 場所の複数選択 + その他自由入力コンポーネント
export function LocationPicker({
  value, onChange, customers, disabled,
}: {
  value: string
  onChange: (value: string) => void
  customers: CustomerOption[]
  disabled?: boolean
}) {
  const customerNames = useMemo(() => new Set(customers.map(c => c.name)), [customers])

  // value をパースして選択中の名前リストとその他テキストを取得
  const { selected, otherText } = useMemo(() => {
    if (!value) return { selected: new Set<string>(), otherText: "" }
    const parts = value.split(", ").filter(Boolean)
    const sel = new Set<string>()
    const others: string[] = []
    for (const p of parts) {
      if (customerNames.has(p)) sel.add(p)
      else others.push(p)
    }
    return { selected: sel, otherText: others.join(", ") }
  }, [value, customerNames])

  const buildValue = useCallback((sel: Set<string>, other: string) => {
    const parts = [...sel, ...(other ? [other] : [])]
    return parts.join(", ")
  }, [])

  const toggleCustomer = useCallback((name: string) => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange(buildValue(next, otherText))
  }, [selected, otherText, onChange, buildValue])

  const setOther = useCallback((text: string) => {
    onChange(buildValue(selected, text))
  }, [selected, onChange, buildValue])

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {customers.map((c) => (
          <label key={c.cust_id} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={selected.has(c.name)}
              onChange={() => toggleCustomer(c.name)}
              disabled={disabled}
              className="size-3.5 accent-primary"
            />
            <span className="text-xs">{c.name}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">その他:</span>
        <Input
          value={otherText}
          onChange={(e) => setOther(e.target.value)}
          disabled={disabled}
          placeholder="自由入力"
          className="h-7 text-xs"
        />
      </div>
    </div>
  )
}
