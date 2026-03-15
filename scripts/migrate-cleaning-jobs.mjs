// Run with: node scripts/migrate-cleaning-jobs.mjs
// cleaning_jobs_raw.tsv を読み込み、cleaning_jobs テーブルへインポートするスクリプト

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// --- TSVパーサー（クォート内の改行・タブに対応） ---
function parseTsv(text) {
  const rows = []
  let i = 0
  const len = text.length

  // 1行分のフィールドを読み取る
  function readRow() {
    const fields = []
    while (i < len) {
      if (text[i] === '"') {
        // クォートされたフィールド
        i++ // opening quote
        let val = ''
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              val += '"'
              i += 2
            } else {
              i++ // closing quote
              break
            }
          } else {
            val += text[i]
            i++
          }
        }
        fields.push(val)
        // フィールド区切り or 行末
        if (i < len && text[i] === '\t') { i++; continue }
        if (i < len && text[i] === '\r') i++
        if (i < len && text[i] === '\n') i++
        break
      } else {
        // クォートなしフィールド
        let val = ''
        while (i < len && text[i] !== '\t' && text[i] !== '\n' && text[i] !== '\r') {
          val += text[i]
          i++
        }
        fields.push(val)
        if (i < len && text[i] === '\t') { i++; continue }
        if (i < len && text[i] === '\r') i++
        if (i < len && text[i] === '\n') i++
        break
      }
    }
    return fields
  }

  // ヘッダー行
  const header = readRow()
  // データ行
  while (i < len) {
    const row = readRow()
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue
    if (row.length !== header.length) {
      console.warn(`警告: カラム数不一致 (expected ${header.length}, got ${row.length}). Row: ${row[0]}`)
      continue
    }
    const obj = {}
    header.forEach((h, idx) => { obj[h.trim()] = row[idx] })
    rows.push(obj)
  }
  return rows
}

// --- メイン処理 ---
async function main() {
  // 1. company_id を取得（is_demo=false の会社）
  const { data: company, error: compErr } = await supabase
    .from('companies')
    .select('id')
    .eq('is_demo', false)
    .limit(1)
    .single()
  if (compErr || !company) {
    console.error('会社が見つかりません:', compErr)
    process.exit(1)
  }
  const companyId = company.id
  console.log(`company_id: ${companyId}`)

  // 2. 社員マッピング（名前の部分一致で emp_id を取得）
  const nameList = ['神谷', '西部', '田澤', '平松', '桑原']
  const empMap = {} // reporter_name → emp_id
  for (const name of nameList) {
    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('emp_id, name')
      .eq('company_id', companyId)
      .ilike('name', `%${name}%`)
    if (empErr || !emps || emps.length === 0) {
      console.error(`社員が見つかりません: ${name}`, empErr)
      process.exit(1)
    }
    empMap[name] = emps[0].emp_id
    console.log(`  ${name} → ${emps[0].emp_id} (${emps[0].name})`)
  }

  // 3. TSV読み込み
  const tsvPath = resolve(__dirname, 'cleaning_jobs_raw.tsv')
  const raw = readFileSync(tsvPath, 'utf-8')
  const rows = parseTsv(raw)
  console.log(`TSV行数: ${rows.length}`)

  // 4. レコード変換（連番でユニークな job_id を生成）
  const records = rows.map((r, idx) => {
    const workDate = r.work_date.replace(/\//g, '-')
    const ym = workDate.replace(/-/g, '').slice(0, 6)
    // 連番（0埋め4桁）でユニーク性を保証
    const seq = String(idx + 1).padStart(4, '0')
    const jobId = `J-${workDate.replace(/-/g, '')}-${seq}`

    // reporter_name から emp_id を検索
    const empId = Object.entries(empMap).find(([name]) => r.reporter_name.includes(name))?.[1]
    if (!empId) {
      console.error(`社員マッピング失敗: reporter_name="${r.reporter_name}"`)
      process.exit(1)
    }

    // ステータスマッピング: 確定/請求済→APPROVED、未確定/空→REVIEW_REQUIRED
    const isApproved = r.status === '確定' || r.status === '請求済'
    const status = isApproved ? 'APPROVED' : 'REVIEW_REQUIRED'

    // 単価: unit_price_final → unit_price_default_snapshot のフォールバック
    const unitPrice = (r.unit_price_final && r.unit_price_final.trim() !== '')
      ? parseFloat(r.unit_price_final)
      : (r.unit_price_default_snapshot && r.unit_price_default_snapshot.trim() !== '')
        ? parseFloat(r.unit_price_default_snapshot)
        : 0

    return {
      company_id: companyId,
      job_id: jobId,
      work_date: workDate,
      ym,
      store_id: r.store_id,
      store_name: r.store_name_snapshot,
      work_code: r.work_code,
      work_name: r.work_name_snapshot,
      car_type_text: r.car_type_text || null,
      id_list_raw: r.id_list_raw || null,
      qty: parseInt(r.qty, 10) || 0,
      unit_price: unitPrice,
      amount: parseFloat(r.amount) || 0,
      price_note: r.price_note || null,
      emp_id: empId,
      status,
      approved_at: isApproved ? r.submitted_at : null,
      created_at: r.submitted_at,
    }
  })

  // 5. バッチインサート（50件ずつ）
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await supabase
      .from('cleaning_jobs')
      .upsert(batch, { onConflict: 'job_id', ignoreDuplicates: true })
    if (error) {
      console.error(`バッチエラー (行 ${i}):`, error)
      process.exit(1)
    }
    inserted += batch.length
    console.log(`  ${inserted} / ${records.length} 件挿入完了`)
  }

  console.log(`\n完了: ${inserted} 件を cleaning_jobs に挿入しました`)
}

main().catch((e) => { console.error(e); process.exit(1) })
