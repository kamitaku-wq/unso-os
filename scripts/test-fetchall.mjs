import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// fetchAll と同じロジックをテスト（ただし anon key ではなく service role key）
async function fetchAll(buildQuery) {
  const PAGE = 1000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await buildQuery(sb).range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function main() {
  // 月別売上テスト（APPROVED のみ、直近6ヶ月）
  const ymList = ['202510', '202511', '202512', '202601', '202602', '202603']

  const data = await fetchAll(s => s.from('cleaning_jobs').select('ym, amount')
    .in('status', ['APPROVED']).in('ym', ymList))

  console.log('fetchAll returned:', data.length, 'rows')

  const totals = {}
  ymList.forEach(ym => { totals[ym] = 0 })
  data.forEach(r => {
    if (r.ym in totals) totals[r.ym] += Number(r.amount)
  })

  console.log('\n月別売上 (APPROVED):')
  ymList.forEach(ym => console.log(`  ${ym}: ¥${totals[ym].toLocaleString()}`))

  // 比較: range なしで取得（1000件制限）
  const { data: limited } = await sb.from('cleaning_jobs').select('ym, amount')
    .in('status', ['APPROVED']).in('ym', ymList)
  console.log('\nrange なし（1000件制限）:', limited.length, 'rows')

  const limitedTotals = {}
  ymList.forEach(ym => { limitedTotals[ym] = 0 })
  limited.forEach(r => {
    if (r.ym in limitedTotals) limitedTotals[r.ym] += Number(r.amount)
  })
  ymList.forEach(ym => console.log(`  ${ym}: ¥${limitedTotals[ym].toLocaleString()}`))
}

main().catch(e => { console.error(e); process.exit(1) })
