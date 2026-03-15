// 日報ページ共通の型定義

export type WorkType = {
  id: string
  work_code: string
  name: string
  default_unit_price: number | null
  is_active: boolean
}

export type Store = { cust_id: string; name: string }

export type Job = {
  id: string
  job_id: string
  work_date: string
  store_name: string
  work_name: string
  car_type_text: string | null
  qty: number
  unit_price: number
  amount: number
  emp_id: string
  status: string
  id_list_raw: string | null
  price_note: string | null
}

// 空のエントリ行を作る
export function emptyEntry() {
  return { store: "", work: "", carType: "", idList: "", qty: "1", unitPrice: "", note: "" }
}
export type Entry = ReturnType<typeof emptyEntry>

// ID一覧から台数を自動計算する
export function autoQtyFromIdList(idList: string): number | null {
  if (!idList.trim()) return null
  return idList.trim().split(/\n/).filter(Boolean).length
}
