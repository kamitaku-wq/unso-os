// 清掃作業実績 個別操作 API（承認・VOID・削除）
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { approveCleaningJob, voidCleaningJob, deleteCleaningJob } from '@/lib/industries/car-cleaning/job'

type Params = { params: Promise<{ id: string }> }

// 承認
export async function PATCH(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await _request.json()

    if (body.action === 'approve') {
      await approveCleaningJob(id)
    } else if (body.action === 'void') {
      await voidCleaningJob(id)
    } else {
      return NextResponse.json({ error: '無効なアクションです' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}

// 削除（VOID のみ）
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    await deleteCleaningJob(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
