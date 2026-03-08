# CLAUDE.md

## このファイルについて
Claude Code / Cursor Agent がプロジェクトを理解するための設定書。
セッション開始時に自動で読み込まれる。
**このファイルを最新に保つことが、AI開発の精度を維持する最重要作業。**

---

## プロジェクト概要

**unso-os（運送OS）** — Next.js + Supabase 版の現場経営システム。
GAS 版（C:/Users/kamit/FUNCTION_cursor/）の後継プロジェクト。

### 事業方針
- **モデルC（コアとアドオンを分ける SaaS）** で展開する
- 最初から業種を絞らない。運送業を第1実装とするが、他業種も初期から受け入れる
- 顧客ごとの差分を記録し、共通化できるものはコアに、業種固有のものはモジュールに整理していく
- AIによる全開発を前提とする。設計の意思決定だけは人間が持つ

### 展開フェーズ
| フェーズ | 顧客数 | 目標 |
|---------|--------|------|
| フェーズ1（現在） | 0→3社 | 基盤固め・複数業種を受け入れながら差分を記録 |
| フェーズ2 | 3→10社 | 有料化・差分の設定化・業種モジュールの整備 |
| フェーズ3 | 10→30社 | モジュール正式分離・スケール準備 |
| フェーズ4 | 30社〜 | 大口顧客の専用環境検討・さらなる業種展開 |

### 旧プロジェクト（参照元）
- パス: `C:/Users/kamit/FUNCTION_cursor/`
- 設計引き継ぎ書: `C:/Users/kamit/FUNCTION_cursor/docs/next_architecture.md`
- スキーマ定義: `C:/Users/kamit/FUNCTION_cursor/Schema.js`
- 業種設定・定数: `C:/Users/kamit/FUNCTION_cursor/Config.js`
- 認証ロジック: `C:/Users/kamit/FUNCTION_cursor/Auth.js`
- 請求ロジック: `C:/Users/kamit/FUNCTION_cursor/BillableLogic.js`
- 経費ロジック: `C:/Users/kamit/FUNCTION_cursor/ExpenseLogic.js`
- 勤怠ロジック: `C:/Users/kamit/FUNCTION_cursor/AttendanceLogic.js`

---

## 技術スタック
- **フロントエンド**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth + Google OAuth
- **ホスティング**: Vercel
- **ローカル開発**: `npm run dev` → localhost:3000

---

## ディレクトリ構成

コアと業種固有の機能を分離する構成を維持すること。
これが将来の業種展開・安全な移行を可能にする最重要の設計方針。

```
unso-os/
├── CLAUDE.md
├── .cursorrules
├── app/
│   ├── layout.tsx              # 共通レイアウト
│   ├── page.tsx                # トップページ（ロール別にリダイレクト）
│   ├── login/page.tsx          # ログイン画面
│   ├── register/page.tsx       # 新規ユーザー登録申請
│   ├── pending/page.tsx        # 申請中画面
│   ├── setup/page.tsx          # 初期セットアップ（OWNER向け）
│   ├── auth/                   # OAuth コールバック
│   ├── admin/page.tsx          # 管理者承認画面
│   ├── dashboard/page.tsx      # 経営ダッシュボード
│   ├── expense/page.tsx        # 経費申請
│   ├── master/page.tsx         # マスタ管理
│   ├── attendance/page.tsx     # 勤怠管理
│   ├── invoice/page.tsx        # 請求書
│   ├── payroll/page.tsx        # 給与
│   └── api/                    # Route Handlers（サーバー API）
├── components/
│   ├── ui/                     # shadcn/ui コンポーネント
│   └── features/               # 機能別コンポーネント
├── lib/
│   ├── supabase/               # Supabase クライアント設定
│   ├── core/                   # 全業種共通のビジネスロジック
│   │   ├── auth.ts             # 認証・ロール判定
│   │   ├── employee.ts         # 社員管理
│   │   └── company.ts          # テナント管理
│   ├── industries/
│   │   └── transport/          # 運送業固有のビジネスロジック
│   │       ├── billable.ts     # 運行実績
│   │       ├── ratecard.ts     # 運賃計算
│   │       └── templates/      # 帳票テンプレート
│   └── utils.ts                # 共通ユーティリティ
├── supabase/
│   └── migrations/             # DB マイグレーション SQL（追加のみ・編集禁止）
└── docs/
    ├── internal_guide.md       # システム説明書（開発者向け）
    ├── business_strategy.md    # 事業展開プラン
    ├── customer_diff_log.md    # 顧客ごとの差分ログ
    └── implementation-status.md
```

---

## データベース設計

### マルチテナント方針
- 1 Supabase プロジェクトで複数クライアントを対応
- Row Level Security (RLS) で `company_id` ごとにデータを完全分離
- 全テーブルに `company_id uuid` カラムを持つ
- `company_id` の一貫性が、将来の安全な移行を保証する。絶対に省略しない

### テーブル一覧
| テーブル名 | 内容 |
|---|---|
| `companies` | テナント（クライアント会社）管理。`industry`・`custom_settings` カラムを持つ |
| `employees` | ユーザー・ロール管理 |
| `emp_requests` | 社員登録申請 |
| `customers` | 荷主マスタ |
| `routes` | 運行ルートマスタ |
| `ratecards` | ルート別単価 |
| `vehicles` | 車両マスタ |
| `billables` | 運行実績・請求管理 |
| `expense_categories` | 経費区分マスタ |
| `expenses` | 経費申請・承認 |
| `attendances` | 勤怠記録 |
| `monthly_closings` | 月次締め管理 |
| `payrolls` | 給与計算結果 |

### companies テーブルの拡張カラム（重要）
```sql
-- 業種識別子: 'transport' / 'construction' / 'general' など
industry text DEFAULT 'transport'

-- 顧客ごとのカスタム設定（JSON形式）
-- ラベル変更・機能ON/OFF・帳票テンプレート指定などに使う
custom_settings jsonb DEFAULT '{}'
```

`custom_settings` の使用例:
```json
{
  "labels": { "customer": "荷主", "route": "ルート" },
  "features": { "payroll": true, "invoice": false },
  "report_template": "default"
}
```

### マイグレーションファイル一覧
| ファイル | 内容 |
|---------|------|
| `001_initial_schema.sql` | 全テーブル定義 + RLS 基本設定 |
| `002_fix_rls_security_definer.sql` | RLS セキュリティ修正 |
| `003_emp_requests_insert_policy.sql` | 社員申請テーブルの挿入ポリシー |
| `004_storage_receipts.sql` | 領収書ストレージ設定 |
| `005_monthly_closings.sql` | 月次締めテーブル |
| `006_payroll.sql` | 給与テーブル |

---

## ロール設計
- `DRIVER`: 現場作業者。自分のデータのみ閲覧・入力可
- `ADMIN`: 管理者。承認・マスタ管理・レポート閲覧可
- `OWNER`: 経営者。全権限 + ダッシュボード

---

## 開発者プロフィール（重要）
- コーディングスキル: 非エンジニア。コードの読み書きはAIに依存
- 役割: 仕様決定・動作確認・フィードバック担当
- AIへの期待: 実装だけでなく「なぜそうするか」も平易に説明してほしい

## 回答スタイルのルール
- 専門用語を使うときは必ず（）で平易な説明を添える
- 「何をしたか」「何が変わったか」「次に何をすべきか」の3点を毎回伝える
- コードの中身の長い解説は不要。動作に影響する部分だけ簡潔に説明する
- 作業の選択肢があるときは、メリット・デメリットを簡潔に添える

---

## コーディング規約

### 基本ルール
- 言語: TypeScript（strict モード。`any` 型は使わない）
- コンポーネント: React Server Components を基本とし、操作が必要な部分のみ `'use client'`
- スタイル: Tailwind CSS + shadcn/ui コンポーネントを優先使用
- API: Next.js Route Handler（`app/api/*/route.ts`）
- DB アクセス: Supabase JS クライアント経由
- エラー処理: try-catch で包み、ユーザーにわかるメッセージを返す
- コメント: 日本語。関数の先頭に「何をする関数か」を1行で記載

### AI開発の限界を防ぐルール（重要）
- **1ファイル200行以内**を守る。超えたら分割を検討する
- **1関数30行以内**を目安にする
- コアと業種固有のロジックを混在させない（`lib/core/` と `lib/industries/` を使い分ける）
- 新しいテーブルや機能を追加したら必ずこの CLAUDE.md を更新する

---

## エージェント分業ルール

### Claude Code が担当
| 作業 | 具体例 |
|---|---|
| DB スキーマ・マイグレーション SQL | テーブル追加、RLS ポリシー設定 |
| 認証・権限設計 | ロール判定、アクセス制御 |
| API Route Handler の新規作成 | `app/api/*/route.ts` |
| `lib/core/` `lib/industries/` のビジネスロジック | 集計・承認・締め処理 |
| 複数ファイルをまたぐ整合性修正 | スキーマ変更に伴う連鎖修正 |
| アーキテクチャ判断・設計相談 | |

### Cursor が担当
| 作業 | 具体例 |
|---|---|
| React コンポーネント（`.tsx`） | 画面・フォーム・テーブル実装 |
| shadcn/ui を使った UI 組み立て | ボタン・モーダル・ドロップダウン |
| Tailwind スタイリング | レイアウト・色・余白 |
| 単一ファイルへの機能追加 | 既存コンポーネントへの列・ボタン追加 |

---

## Git 運用ルール
- ファイルを変更したら、作業完了時に必ず `git status` を確認し、対象差分だけを `git add` → `git commit`
- コミットは「壊れた途中状態」ではなく、最低限動作がそろった意味のある単位で行う
- コミット前に既存の未コミット差分を確認し、自分の変更とユーザーの変更を混同しない
- コミットメッセージ規約: `feat:` `fix:` `style:` `refactor:` `chore:` `docs:`
- `.env.local`、認証情報、秘密鍵、適用済み migration の直接編集結果はコミットしない
- `git push` の実行は、ユーザーの明示許可または当該会話内の明確な継続指示がある場合のみ
- `git reset --hard`、`git checkout --`、強制 push などの破壊的操作は、ユーザー明示許可なしで行わない
- Vercel は GitHub 連携で自動デプロイ（push → 自動反映）

---

## 触らないファイル
- `.env.local`（環境変数・シークレット。git にコミットしない）
- 適用済みマイグレーション SQL（新規追加のみ、既存ファイルは編集禁止）

---

## よく使うコマンド
```bash
npm run dev          # ローカル開発サーバー起動（localhost:3000）
npm run build        # 本番ビルド確認
npx supabase db push # マイグレーション適用
git push             # Vercel へ自動デプロイ
```

---

## 参照ドキュメント
- `docs/internal_guide.md` — システム全体の説明書（開発者向け）
- `docs/business_strategy.md` — 事業展開プランの詳細
- `docs/customer_diff_log.md` — 顧客ごとの差分ログ（必ず記録を続ける）
