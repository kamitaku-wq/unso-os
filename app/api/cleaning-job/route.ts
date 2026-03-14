// 清掃作業実績 API（一覧取得 + 新規登録）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getCleaningJobs, createCleaningJob } from '@/lib/industries/car-cleaning/job'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ym = searchParams.get('ym')
    if (!ym) return NextResponse.json({ error: 'ym パラメータが必要です' }, { status: 400 })

    const jobs = await getCleaningJobs(ym)
    return NextResponse.json(jobs)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createCleaningJob(body)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
