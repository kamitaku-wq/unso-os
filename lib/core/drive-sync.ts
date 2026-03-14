// Google Drive への画像転送ロジック
// Supabase Storage に一時保存されたレシート画像を、各社の Google Drive フォルダへ転送する
import { createClient as createServiceClient } from '@supabase/supabase-js'

type SyncResult = {
  synced: number
  errors: string[]
}

// Google Drive にファイルをアップロードする
async function uploadToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  }

  // multipart upload
  const boundary = 'drive_sync_boundary'
  const metaPart = JSON.stringify(metadata)
  const body = new Uint8Array(
    await new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      fileBuffer,
      `\r\n--${boundary}--`,
    ]).arrayBuffer()
  )

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Drive upload failed: ${err}`)
  }

  const data = (await res.json()) as { id: string; webViewLink: string }
  return data.webViewLink
}

// Service Account の JWT から Access Token を取得する
async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const key = JSON.parse(serviceAccountKey) as {
    client_email: string
    private_key: string
    token_uri: string
  }

  // JWT ヘッダー
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const claimSet = btoa(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: key.token_uri,
      exp: now + 3600,
      iat: now,
    })
  )

  // RS256 署名（Web Crypto API）
  const signInput = `${header}.${claimSet}`
  const pemBody = key.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signInput)
  )

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // base64url エンコードされた header と claimSet も同様に変換
  const headerB64 = header.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const claimB64 = claimSet.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const jwt = `${headerB64}.${claimB64}.${sig}`

  const tokenRes = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token: string }
  return tokenData.access_token
}

// 未転送のレシートを Google Drive に転送する
export async function syncReceiptsToDrive(): Promise<SyncResult> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    return { synced: 0, errors: ['GOOGLE_SERVICE_ACCOUNT_KEY is not configured'] }
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 未転送のレシートを持つ経費を取得（receipt_url が設定済み & receipt_synced = false）
  const { data: expenses, error: fetchErr } = await admin
    .from('expenses')
    .select('id, receipt_url, company_id, emp_id, expense_date')
    .eq('receipt_synced', false)
    .not('receipt_url', 'is', null)
    .limit(50)

  if (fetchErr) return { synced: 0, errors: [fetchErr.message] }
  if (!expenses || expenses.length === 0) return { synced: 0, errors: [] }

  // 対象会社の custom_settings から google_drive_folder_id を取得
  const companyIds = [...new Set(expenses.map((e) => e.company_id))]
  const { data: companies } = await admin
    .from('companies')
    .select('id, custom_settings')
    .in('id', companyIds)

  const folderMap = new Map<string, string>()
  for (const c of companies ?? []) {
    const settings = c.custom_settings as { google_drive_folder_id?: string } | null
    if (settings?.google_drive_folder_id) {
      folderMap.set(c.id, settings.google_drive_folder_id)
    }
  }

  let accessToken: string | null = null
  const result: SyncResult = { synced: 0, errors: [] }

  for (const expense of expenses) {
    const folderId = folderMap.get(expense.company_id)
    if (!folderId) {
      // この会社は Drive 未設定 → スキップ
      continue
    }

    try {
      // Access Token を遅延取得（1回だけ）
      if (!accessToken) {
        accessToken = await getAccessToken(serviceAccountKey)
      }

      // Supabase Storage からダウンロード
      const { data: fileData, error: dlErr } = await admin.storage
        .from('receipts')
        .download(expense.receipt_url)

      if (dlErr || !fileData) {
        result.errors.push(`${expense.id}: download failed`)
        continue
      }

      // ファイル名を生成
      const ext = expense.receipt_url.split('.').pop() ?? 'jpg'
      const fileName = `${expense.expense_date}_${expense.emp_id}_${expense.id.slice(0, 8)}.${ext}`

      // Google Drive にアップロード
      const driveUrl = await uploadToDrive(
        accessToken,
        folderId,
        fileName,
        await fileData.arrayBuffer(),
        fileData.type || 'image/jpeg',
      )

      // DB 更新: receipt_url を Drive URL に、receipt_synced = true
      await admin
        .from('expenses')
        .update({ receipt_url: driveUrl, receipt_synced: true })
        .eq('id', expense.id)

      // Supabase Storage から削除
      await admin.storage.from('receipts').remove([expense.receipt_url])

      result.synced++
    } catch (e) {
      result.errors.push(`${expense.id}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return result
}
