// レシート画像アップロード API
// ファイルを Supabase Storage に保存し、URL を expenses テーブルに記録する
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMyEmployee } from '@/lib/core/auth'
import { apiError } from '@/lib/api-error'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const employee = await getMyEmployee()
    const { id } = await params

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })

    // 対応形式チェック
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'JPEG・PNG・WebP・PDF のみ対応しています' }, { status: 400 })
    }

    // ファイルサイズチェック（5MB 以内）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは 5MB 以内にしてください' }, { status: 400 })
    }

    const supabase = await createClient()

    // 自分の経費かADMIN/OWNERかチェック
    const { data: expense } = await supabase
      .from('expenses')
      .select('emp_id')
      .eq('id', id)
      .single()
    if (!expense) return NextResponse.json({ error: '経費が見つかりません' }, { status: 404 })
    if (expense.emp_id !== employee.emp_id && !['ADMIN', 'OWNER'].includes(employee.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // ストレージパス: {emp_id}/{expense_uuid}/{timestamp}.{ext}
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${employee.emp_id}/${id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type, upsert: true })

    if (uploadErr) throw new Error('アップロードに失敗しました: ' + uploadErr.message)

    // 署名付き URL（1時間有効）を取得
    const { data: urlData } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 3600)

    // expenses テーブルの receipt_url を更新
    await supabase
      .from('expenses')
      .update({ receipt_url: path })
      .eq('id', id)

    return NextResponse.json({ path, url: urlData?.signedUrl })
  } catch (e) {
    return apiError(e, 'アップロードに失敗しました')
  }
}

// レシートの署名付き URL を取得する（表示用）
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const employee = await getMyEmployee()
    const { id } = await params
    const supabase = await createClient()

    const { data: expense } = await supabase
      .from('expenses')
      .select('receipt_url, emp_id')
      .eq('id', id)
      .single()

    if (expense && expense.emp_id !== employee.emp_id && !['ADMIN', 'OWNER'].includes(employee.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    if (!expense?.receipt_url) {
      return NextResponse.json({ url: null })
    }

    const { data } = await supabase.storage
      .from('receipts')
      .createSignedUrl(expense.receipt_url, 3600)

    return NextResponse.json({ url: data?.signedUrl ?? null })
  } catch (e) {
    return apiError(e, '取得に失敗しました')
  }
}
