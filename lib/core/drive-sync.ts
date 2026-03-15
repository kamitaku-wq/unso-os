// Google Drive への画像転送ロジック
// Supabase Storage に一時保存されたレシート画像を、各社の Google Drive フォルダへ転送する
// 認証: Vercel OIDC + Google Workload Identity Federation（Service Account キー不要）
import { createClient as createServiceClient } from '@supabase/supabase-js'

export type SyncResult = {
  synced: number
  errors: string[]
}

// Google Drive にサブフォルダを取得または作成する
export async function getOrCreateSubfolder(
  accessToken: string,
  parentId: string,
  folderName: string,
): Promise<string> {
  // 既存フォルダを検索
  const q = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as { files: { id: string }[] }
    if (searchData.files.length > 0) return searchData.files[0].id
  }

  // 存在しなければ作成
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      parents: [parentId],
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Drive folder creation failed: ${err}`)
  }
  const created = (await createRes.json()) as { id: string }
  return created.id
}

// ネストされたフォルダパスを順番に作成する（例: ['receipts', '2026-03', 'ガソリン']）
export async function getOrCreateNestedPath(
  accessToken: string,
  rootFolderId: string,
  segments: string[],
): Promise<string> {
  let currentId = rootFolderId
  for (const seg of segments) {
    currentId = await getOrCreateSubfolder(accessToken, currentId, seg)
  }
  return currentId
}

// Google Drive にファイルをアップロードする
export async function uploadToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const metadata = { name: fileName, parents: [folderId] }
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
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
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

// Workload Identity Federation で Google Access Token を取得する
// 1. Vercel OIDC トークンを Google STS に交換
// 2. STS トークンで Service Account を impersonate して Drive 用 Access Token を取得
export async function getAccessTokenViaWIF(oidcToken: string): Promise<string> {
  const provider = process.env.GCP_WORKLOAD_IDENTITY_PROVIDER
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL

  if (!oidcToken || !provider || !serviceAccountEmail) {
    throw new Error('Workload Identity Federation の環境変数が未設定です')
  }

  // Step 1: Vercel OIDC トークンを Google STS トークンに交換
  const stsRes = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: `//iam.googleapis.com/${provider}`,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token: oidcToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    }),
  })

  if (!stsRes.ok) {
    const err = await stsRes.text()
    throw new Error(`STS token exchange failed: ${err}`)
  }

  const stsData = (await stsRes.json()) as { access_token: string }

  // Step 2: Service Account を impersonate して Drive スコープの Access Token を取得
  const impersonateUrl = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`
  const impRes = await fetch(impersonateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stsData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scope: ['https://www.googleapis.com/auth/drive'],
      lifetime: '3600s',
    }),
  })

  if (!impRes.ok) {
    const err = await impRes.text()
    throw new Error(`Service Account impersonation failed: ${err}`)
  }

  const impData = (await impRes.json()) as { accessToken: string }
  return impData.accessToken
}

// 未転送のレシートを Google Drive に転送する
export async function syncReceiptsToDrive(oidcToken?: string): Promise<SyncResult> {
  // 環境変数チェック
  if (!process.env.GCP_WORKLOAD_IDENTITY_PROVIDER || !process.env.GCP_SERVICE_ACCOUNT_EMAIL) {
    return { synced: 0, errors: ['GCP_WORKLOAD_IDENTITY_PROVIDER / GCP_SERVICE_ACCOUNT_EMAIL が未設定です'] }
  }
  if (!oidcToken) {
    return { synced: 0, errors: ['OIDC トークンが渡されていません'] }
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 未転送のレシートを持つ経費を取得
  const { data: expenses, error: fetchErr } = await admin
    .from('expenses')
    .select('id, receipt_url, company_id, emp_id, expense_date, category_name')
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
    if (!folderId) continue

    try {
      // Access Token を遅延取得（1回だけ）
      if (!accessToken) {
        accessToken = await getAccessTokenViaWIF(oidcToken)
      }

      // Supabase Storage からダウンロード
      const { data: fileData, error: dlErr } = await admin.storage
        .from('receipts')
        .download(expense.receipt_url)

      if (dlErr || !fileData) {
        result.errors.push(`${expense.id}: download failed`)
        continue
      }

      // サブフォルダを作成: receipts/{YYYY-MM}/{経費区分}/
      const ym = expense.expense_date.slice(0, 7) // YYYY-MM
      const category = expense.category_name || '未分類'
      const targetFolderId = await getOrCreateNestedPath(
        accessToken, folderId, ['receipts', ym, category],
      )

      // ファイル名を生成
      const ext = expense.receipt_url.split('.').pop() ?? 'jpg'
      const fileName = `${expense.expense_date}_${expense.emp_id}_${expense.id.slice(0, 8)}.${ext}`

      // Google Drive にアップロード
      const driveUrl = await uploadToDrive(
        accessToken,
        targetFolderId,
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
