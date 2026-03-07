// 経費申請 API（自分の一覧取得・新規申請）
import { NextResponse } from 'next/server'
import { getMyExpenses, createExpense } from '@/lib/server/expense'

export async function GET() {
  try {
    const data = await getMyExpenses()
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createExpense({
      expense_date: body.expense_date,
      category_id: body.category_id,
      category_name: body.category_name,
      amount: Number(body.amount),
      vendor: body.vendor ?? null,
      description: body.description ?? null,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '申請に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
