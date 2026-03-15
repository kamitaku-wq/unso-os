// 請求書PDFを Google Drive に保存する API
export const maxDuration = 30

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/core/auth'
import { saveInvoiceToDrive } from '@/lib/core/drive-backup'
import { apiError } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const ym = formData.get('ym') as string | null
    const fileName = formData.get('fileName') as string | null

    if (!file || !ym || !fileName) {
      return NextResponse.json({ error: 'file, ym, fileName が必要です' }, { status: 400 })
    }

    // OIDC トークン取得
    let oidcToken: string
    try {
      const { getVercelOidcToken } = await import('@vercel/oidc')
      oidcToken = await getVercelOidcToken()
    } catch {
      return NextResponse.json({ error: 'OIDC トークンの取得に失敗しました' }, { status: 500 })
    }

    const pdfBuffer = await file.arrayBuffer()
    const driveUrl = await saveInvoiceToDrive(
      oidcToken, employee.company_id, ym, fileName, pdfBuffer,
    )

    return NextResponse.json({ driveUrl })
  } catch (e) {
    return apiError(e)
  }
}
