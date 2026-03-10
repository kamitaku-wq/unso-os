// 経費申請 API（自分の一覧取得・新規申請）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getMyExpenses, createExpense } from '@/lib/core/expense'

export async function GET() {
  try {
    const data = await getMyExpenses()
    return NextResponse.json(data)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const amount = Number(body.amount)
    if (!body.expense_date) return NextResponse.json({ error: '日付は必須です' }, { status: 400 })
    if (isNaN(amount) || amount <= 0) return NextResponse.json({ error: '正しい金額を入力してください' }, { status: 400 })
    const result = await createExpense({
      expense_date: body.expense_date,
      category_id: body.category_id,
      category_name: body.category_name,
      amount,
      vendor: body.vendor ?? null,
      description: body.description ?? null,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
