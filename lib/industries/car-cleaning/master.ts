// 清掃業務 作業種別マスタの CRUD
import { createClient } from '@/lib/supabase/server'
import { getMyEmployee, requireRole } from '@/lib/core/auth'

export type WorkType = {
  id: string
  work_code: string
  name: string
  default_unit_price: number | null
  is_active: boolean
  note: string | null
  sort_order: number
}

// 作業種別一覧を取得する
export async function getWorkTypes(): Promise<WorkType[]> {
  await getMyEmployee()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('works')
    .select('id, work_code, name, default_unit_price, is_active, note, sort_order')
    .order('sort_order')
    .order('work_code')

  if (error) throw new Error(error.message)
  return (data ?? []) as WorkType[]
}

// 作業種別を追加する（ADMIN/OWNER のみ）
export async function createWorkType(input: {
  work_code: string
  name: string
  default_unit_price: number | null
  note: string | null
}) {
  const employee = await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { error } = await supabase.from('works').insert({
    company_id: employee.company_id,
    ...input,
  })
  if (error) throw new Error(error.message)
}

// 作業種別を更新する（ADMIN/OWNER のみ）
export async function updateWorkType(id: string, input: {
  name?: string
  default_unit_price?: number | null
  is_active?: boolean
  note?: string | null
  sort_order?: number
}) {
  await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('works')
    .update(input)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// 作業種別の表示順を一括更新する（ADMIN/OWNER のみ）
export async function reorderWorkTypes(orderedIds: string[]) {
  await requireRole(['ADMIN', 'OWNER'])
  const supabase = await createClient()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('works')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])
    if (error) throw new Error(error.message)
  }
}
