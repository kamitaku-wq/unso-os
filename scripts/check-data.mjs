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

async function main() {
  // cleaning_jobs 月別集計
  // 全件取得（1000件制限を回避）
  let allJobs = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await sb
      .from('cleaning_jobs')
      .select('ym, amount, status, unit_price, qty')
      .range(from, from + PAGE - 1)
    if (error) { console.error(error); break }
    allJobs = allJobs.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  const jobs = allJobs
  const jobCount = jobs.length

  console.log('cleaning_jobs total:', jobCount)

  const byYm = {}
  let zeroAmount = 0
  let mismatch = 0
  jobs.forEach(r => {
    const ym = r.ym
    if (!(ym in byYm)) byYm[ym] = { count: 0, total: 0, approved: 0, approvedTotal: 0 }
    byYm[ym].count++
    byYm[ym].total += Number(r.amount)
    if (r.status === 'APPROVED') {
      byYm[ym].approved++
      byYm[ym].approvedTotal += Number(r.amount)
    }
    if (Number(r.amount) === 0) zeroAmount++
    // qty * unit_price vs amount の不一致チェック
    const expected = Number(r.qty) * Number(r.unit_price)
    if (Math.abs(expected - Number(r.amount)) > 1) mismatch++
  })

  console.log('\n月別:')
  Object.keys(byYm).sort().forEach(ym => {
    const d = byYm[ym]
    console.log(`  ${ym}: 全${d.count}件 合計¥${d.total} | APPROVED ${d.approved}件 ¥${d.approvedTotal}`)
  })
  console.log(`\n金額0円: ${zeroAmount}件`)
  console.log(`qty*unit_price !== amount: ${mismatch}件`)

  // サンプル: 金額不一致のレコード
  const sample = jobs.filter(r => {
    const expected = Number(r.qty) * Number(r.unit_price)
    return Math.abs(expected - Number(r.amount)) > 1
  }).slice(0, 5)
  if (sample.length > 0) {
    console.log('\n金額不一致サンプル:')
    sample.forEach(r => {
      console.log(`  qty=${r.qty} price=${r.unit_price} expected=${r.qty * r.unit_price} actual=${r.amount}`)
    })
  }

  // expenses 確認
  const { count: expCount } = await sb
    .from('expenses')
    .select('id', { count: 'exact', head: true })
  console.log(`\nexpenses total: ${expCount}`)
}

main().catch(e => { console.error(e); process.exit(1) })
