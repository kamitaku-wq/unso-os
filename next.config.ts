import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  /* config options here */
}

export default withSentryConfig(nextConfig, {
  // Sentry のプロジェクト設定（.env.local の SENTRY_AUTH_TOKEN を使用）
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // ソースマップをアップロードしてエラーの行番号を正確に表示する
  silent: true,

  // ビルド時のソースマップアップロードを有効化
  widenClientFileUpload: true,

  // 自動インストゥルメンテーション
  automaticVercelMonitors: true,
})
