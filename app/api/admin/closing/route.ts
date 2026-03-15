// 月次締め API（一覧取得・締め実行・取り消し）
import { NextResponse } from 'next/server'
import { getClosings, closeMonth, reopenMonth, summarizeMonth } from '@/lib/core/closing'
import { requireRole } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'

// 締め済み月一覧を取得
export async function GET() {
  try {
    await requireRole(['ADMIN', 'OWNER'])
    const data = await getClosings()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

// 月次締めを実行
export async function POST(request: Request) {
  try {
    const employee = await requireRole(['ADMIN', 'OWNER'])
    const body = await request.json()

    if (!body.ym || !/^\d{6}$/.test(body.ym)) {
      return NextResponse.json({ error: 'ym は YYYYMM 形式で指定してください' }, { status: 400 })
    }

    if (body.preview === true) {
      const preview = await summarizeMonth(body.ym)
      return NextResponse.json(preview)
    }

    // Drive バックアップ用の OIDC トークンを取得（Vercel 環境のみ）
    let oidcToken: string | undefined
    try {
      const { getVercelOidcToken } = await import('@vercel/oidc')
      oidcToken = await getVercelOidcToken()
    } catch { /* ローカル環境ではスキップ */ }

    const result = await closeMonth(body.ym, employee.name, body.note ?? undefined, oidcToken)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}

// 月次締めを取り消す（OWNER のみ）
export async function DELETE(request: Request) {
  try {
    await requireRole(['OWNER'])
    const { searchParams } = new URL(request.url)
    const ym = searchParams.get('ym')

    if (!ym) return NextResponse.json({ error: 'ym が必要です' }, { status: 400 })

    await reopenMonth(ym)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
