// マスタデータのサーバー側取得ロジック（ドロップダウン用）
import { createClient } from '@/lib/supabase/server'

// 荷主一覧を取得する
export async function getCustomers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('cust_id, name')
    .order('cust_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

// ルート一覧を取得する（積み地・降ろし地デフォルト値を含む）
export async function getRoutes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('routes')
    .select('route_id, cust_id, pickup_default, drop_default')
    .order('route_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

// 有効な車両一覧を取得する
export async function getVehicles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('vehicle_id, name')
    .eq('is_active', true)
    .order('vehicle_id')
  if (error) throw new Error(error.message)
  return data ?? []
}
