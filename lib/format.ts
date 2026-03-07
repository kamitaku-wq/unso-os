// 金額を画面表示用の円表記へ整える
export function formatCurrency(value: number | null | undefined) {
  return value == null
    ? "－"
    : value.toLocaleString("ja-JP", {
        style: "currency",
        currency: "JPY",
      })
}
