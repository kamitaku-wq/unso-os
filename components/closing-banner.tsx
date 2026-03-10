// 月次締め済みの場合にフォーム上部に表示する警告バナー
import { Lock } from "lucide-react"

type Props = {
  ym: string // "YYYYMM" 形式
  closedMonths: string[]
}

export function ClosingBanner({ ym, closedMonths }: Props) {
  if (!closedMonths.includes(ym)) return null

  const year = ym.slice(0, 4)
  const month = ym.slice(4, 6).replace(/^0/, "")

  return (
    <div role="alert" className="flex items-center gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
      <Lock className="size-4 shrink-0 text-orange-500" aria-hidden="true" />
      <span>
        <span className="font-semibold">{year}年{month}月</span> は月次締め済みのため、新規入力できません。
        修正が必要な場合は管理者に締め取消を依頼してください。
      </span>
    </div>
  )
}
