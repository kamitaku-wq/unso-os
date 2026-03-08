// マスタデータのサーバー側ロジック（参照 + CRUD）
import { createClient } from '@/lib/supabase/server'

// --- 荷主 ---

export async function getCustomers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('id, cust_id, name, address')
    .order('cust_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCustomer(input: { cust_id: string; name: string; address?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('google_email', user.email!)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  const { error } = await supabase.from('customers').insert({
    company_id: employee.company_id,
    ...input,
  })
  if (error) throw new Error(error.message)
}

export async function updateCustomer(id: string, input: { cust_id?: string; name?: string; address?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('customers').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- ルート ---

export async function getRoutes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('routes')
    .select('id, route_id, cust_id, pickup_default, drop_default')
    .order('route_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createRoute(input: { route_id: string; cust_id: string; pickup_default?: string; drop_default?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('google_email', user.email!)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  const { error } = await supabase.from('routes').insert({
    company_id: employee.company_id,
    ...input,
  })
  if (error) throw new Error(error.message)
}

export async function updateRoute(id: string, input: { route_id?: string; cust_id?: string; pickup_default?: string; drop_default?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('routes').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRoute(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('routes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- 経費区分 ---

export async function getExpenseCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, category_id, name, is_active, note')
    .eq('is_active', true)
    .order('category_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createExpenseCategory(input: { category_id: string; name: string; note?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('google_email', user.email!)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  const { error } = await supabase.from('expense_categories').insert({
    company_id: employee.company_id,
    is_active: true,
    ...input,
  })
  if (error) throw new Error(error.message)
}

export async function updateExpenseCategory(id: string, input: { category_id?: string; name?: string; is_active?: boolean; note?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('expense_categories').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteExpenseCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('expense_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- 運賃マスタ ---

export async function getRatecards() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ratecards')
    .select('id, route_id, cust_id, base_fare')
    .order('route_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertRatecard(input: { route_id: string; cust_id: string; base_fare: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('google_email', user.email!)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  const { error } = await supabase.from('ratecards').upsert(
    { company_id: employee.company_id, ...input },
    { onConflict: 'company_id,route_id' }
  )
  if (error) throw new Error(error.message)
}

export async function deleteRatecard(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('ratecards').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- 車両 ---

export async function getVehicles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, vehicle_id, name, plate_no, vehicle_type, capacity_ton, is_active, memo')
    .order('vehicle_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createVehicle(input: { vehicle_id: string; name: string; plate_no?: string; vehicle_type?: string; capacity_ton?: number; memo?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  const { data: employee } = await supabase
    .from('employees')
    .select('company_id')
    .eq('google_email', user.email!)
    .single()
  if (!employee) throw new Error('社員情報が見つかりません')

  const { error } = await supabase.from('vehicles').insert({
    company_id: employee.company_id,
    is_active: true,
    ...input,
  })
  if (error) throw new Error(error.message)
}

export async function updateVehicle(id: string, input: { vehicle_id?: string; name?: string; plate_no?: string; vehicle_type?: string; capacity_ton?: number; is_active?: boolean; memo?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('vehicles').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteVehicle(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
