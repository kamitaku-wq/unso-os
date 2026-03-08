// 金額を画面表示用の円表記へ整える
export function formatCurrency(value: number | null | undefined) {
  return value == null
    ? "－"
    : value.toLocaleString("ja-JP", {
        style: "currency",
        currency: "JPY",
      })
}

// APIレスポンスからエラーメッセージを取り出す
export function getErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as Record<string, unknown>).error === "string"
  ) {
    return (data as Record<string, unknown>).error as string
  }
  return fallback
}

// 日時文字列を日本語の日時表示に変換する
export function formatDateTime(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// 日付文字列を日本語の日付表示に変換する
export function formatDate(value: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("ja-JP")
}
