// Run with: node scripts/migrate-expenses.mjs
// expenses_raw.tsv を読み込み、expenses テーブルへインポートするスクリプト

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

  function readRow() {
    const fields = []
    while (i < len) {
      if (text[i] === '"') {
        i++
        let val = ''
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              val += '"'
              i += 2
            } else {
              i++
              break
            }
          } else {
            val += text[i]
            i++
          }
        }
        fields.push(val)
        if (i < len && text[i] === '\t') { i++; continue }
        if (i < len && text[i] === '\r') i++
        if (i < len && text[i] === '\n') i++
        break
      } else {
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

  const header = readRow()
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

// --- extra_fields を生成する関数 ---
function buildExtraFields(expCode, priceNote) {
  if (!priceNote || priceNote.trim() === '') return null

  switch (expCode) {
    case 'gas':
      return { gas_liters: priceNote }
    case 'highw': {
      // "A〜B" パターンをパース
      const match = priceNote.match(/^(.+?)〜(.+)$/)
      if (match) {
        return { highw_in: match[1].trim(), highw_out: match[2].trim() }
      }
      // 〜がない場合はそのまま
      return { highw_in: priceNote, highw_out: '' }
    }
    case 'cons':
    case 'other':
    case 'enterm':
      return { details_text: priceNote }
    default:
      return { details_text: priceNote }
  }
}

// --- description を生成（gas, highw 以外のみ） ---
function buildDescription(expCode, priceNote) {
  if (expCode === 'gas' || expCode === 'highw') return null
  return priceNote && priceNote.trim() !== '' ? priceNote : null
}

// --- メイン処理 ---
async function main() {
  // 1. company_id を取得
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

  // 2. 社員マッピング
  const nameList = ['神谷', '西部', '田澤', '平松', '桑原']
  const empMap = {}
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
  const tsvPath = resolve(__dirname, 'expenses_raw.tsv')
  const raw = readFileSync(tsvPath, 'utf-8')
  const rows = parseTsv(raw)
  console.log(`TSV行数: ${rows.length}`)

  // 4. レコード変換
  const records = rows.map((r) => {
    const usedDate = r.used_date.replace(/\//g, '-')
    const ym = usedDate.replace(/-/g, '').slice(0, 6)
    const expenseId = `E-${usedDate.replace(/-/g, '')}-${r.submission_id.slice(0, 4).toUpperCase()}`

    const empId = Object.entries(empMap).find(([name]) => r.reporter_name.includes(name))?.[1]
    if (!empId) {
      console.error(`社員マッピング失敗: reporter_name="${r.reporter_name}"`)
      process.exit(1)
    }

    const isApproved = r.status === '確定'

    return {
      company_id: companyId,
      expense_id: expenseId,
      emp_id: empId,
      status: isApproved ? 'APPROVED' : 'SUBMITTED',
      submitted_at: r.submitted_at,
      ym,
      expense_date: usedDate,
      category_id: r.exp_code,
      category_name: r.exp_name_snapshot,
      amount: parseFloat(r.amount),
      vendor: r.store_name || null,
      description: buildDescription(r.exp_code, r.price_note),
      receipt_url: r.receipt_image_url || null,
      receipt_synced: true,
      extra_fields: buildExtraFields(r.exp_code, r.price_note),
      approved_at: isApproved ? r.submitted_at : null,
      approved_by: null,
    }
  })

  // 5. バッチインサート（50件ずつ）
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await supabase
      .from('expenses')
      .upsert(batch, { onConflict: 'company_id,expense_id', ignoreDuplicates: true })
    if (error) {
      console.error(`バッチエラー (行 ${i}):`, error)
      process.exit(1)
    }
    inserted += batch.length
    console.log(`  ${inserted} / ${records.length} 件挿入完了`)
  }

  console.log(`\n完了: ${inserted} 件を expenses に挿入しました`)
}

main().catch((e) => { console.error(e); process.exit(1) })
