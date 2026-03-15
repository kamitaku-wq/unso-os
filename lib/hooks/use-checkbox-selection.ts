// テーブル行のチェックボックス選択を管理するカスタムフック
import { useCallback, useMemo, useState } from 'react'

export function useCheckboxSelection(selectableIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allChecked = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const someChecked = selectableIds.some((id) => selected.has(id))

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (selectableIds.every((id) => prev.has(id))) {
        selectableIds.forEach((id) => next.delete(id))
      } else {
        selectableIds.forEach((id) => next.add(id))
      }
      return next
    })
  }, [selectableIds])

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  return { selected, allChecked, someChecked, toggleAll, toggleOne, clearSelection }
}
