// 日付関連の共通ユーティリティ

// YYYYMM 文字列から月の日付範囲を返す
export function ymToRange(ym: string) {
  const y = parseInt(ym.slice(0, 4), 10)
  const m = parseInt(ym.slice(4, 6), 10)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    start: `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`,
    end: `${ym.slice(0, 4)}-${ym.slice(4, 6)}-${String(lastDay).padStart(2, '0')}`,
  }
}

// 前月同日比の日付範囲を返す（当月の経過日数に合わせて前月範囲を制限）
export function getPrevMonthSameDayRange(prevYm: string) {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const prevYear = parseInt(prevYm.slice(0, 4))
  const prevMonth = parseInt(prevYm.slice(4, 6))
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate()
  const prevCutoffDay = Math.min(dayOfMonth, prevLastDay)
  return {
    start: `${prevYm.slice(0, 4)}-${prevYm.slice(4, 6)}-01`,
    end: `${prevYm.slice(0, 4)}-${prevYm.slice(4, 6)}-${String(prevCutoffDay).padStart(2, '0')}`,
  }
}
