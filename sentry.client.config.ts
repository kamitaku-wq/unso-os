// ブラウザ（クライアント側）で動く Sentry の設定
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 本番環境のみ有効化（開発中は無効）
  enabled: process.env.NODE_ENV === "production",

  // エラーの 100% をキャプチャ（サンプリングレート）
  tracesSampleRate: 1.0,

  // リプレイ機能（エラー前後の操作を録画）
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration(),
  ],
})
