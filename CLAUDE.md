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

---

## 技術スタック
- **フロントエンド**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth + Google OAuth（Google アカウント必須）
- **ホスティング**: Vercel（商用利用前に Hobby → Pro への移行が必要）
- **ローカル開発**: `npm run dev` → localhost:3000

---

## ディレクトリ構成

コアと業種固有の機能を分離する構成を維持すること。

```
unso-os/
├── CLAUDE.md
├── app/
│   ├── page.tsx                # トップページ（ロール別にリダイレクト）
│   ├── login/page.tsx          # ログイン画面（Google OAuth）
│   ├── register/page.tsx       # 新規ユーザー登録申請フォーム
│   ├── pending/page.tsx        # 申請中待機画面
│   ├── setup/page.tsx          # 初期セットアップ（OWNER向け）
│   ├── invite/page.tsx         # 招待リンク経由の登録フォーム
│   ├── auth/                   # OAuth コールバック（next パラメータ対応）
│   ├── admin/page.tsx          # 管理者承認画面（実績・経費・勤怠・社員・締め・招待）
│   ├── dashboard/page.tsx      # 経営ダッシュボード（OWNER専用）
│   ├── expense/page.tsx        # 経費申請・一覧（DRIVER: 申請+取り消し）
│   ├── master/page.tsx         # マスタ管理（荷主・ルート・運賃・経費区分・車両）
│   ├── attendance/page.tsx     # 勤怠管理（DRIVER: 申請+取り消し）
│   ├── shift/page.tsx          # シフト管理（全員閲覧・ADMIN/OWNER編集）
│   ├── invoice/page.tsx        # 請求書
│   ├── payroll/page.tsx        # 給与計算・設定
│   └── api/                    # Route Handlers
│       ├── admin/              # 管理者用API（attendances, billables, employees, emp-requests, expenses, invite）
│       ├── attendance/[id]/    # 勤怠個別（承認・却下・取り消し・削除）
│       ├── billable/[id]/      # 実績個別（承認・却下・VOID・削除）
│       ├── demo-register/      # デモ会社への自動登録（is_demo=true の場合のみ）
│       ├── expense/[id]/       # 経費個別（承認・却下・取り消し・削除）
│       ├── export/             # CSV エクスポート（attendances・billables・expenses）
│       ├── invite/             # 招待トークン経由の申請受付（公開エンドポイント）
│       ├── master/             # マスタデータ（customers・routes・ratecards・vehicles・expense-categories）
│       ├── me/                 # ログイン中社員情報取得
│       ├── shift/[id]/         # シフト個別操作
│       └── payroll/            # 給与計算・設定
├── components/
│   ├── ui/                     # shadcn/ui コンポーネント
│   ├── admin/                  # 管理画面用コンポーネント（emp-request-panel, invite-panel）
│   └── （共通コンポーネント）   # app-shell, status-badge, empty-state, table-skeleton 等
├── lib/
│   ├── supabase/               # Supabase クライアント設定（browser.ts / server.ts）
│   ├── core/                   # 全業種共通のビジネスロジック
│   │   ├── auth.ts             # 認証・ロール判定（getMyEmployee / requireRole）
│   │   ├── attendance.ts       # 勤怠（申請・承認・却下・取り消し・削除）
│   │   ├── closing.ts          # 月次締め（isMonthClosed / closeMonth / reopenMonth）
│   │   ├── employee.ts         # 社員管理・申請承認
│   │   ├── expense.ts          # 経費（申請・承認・却下・取り消し・削除）
│   │   ├── export.ts           # CSV エクスポート（社員名カラム含む）
│   │   ├── invite.ts           # 招待トークン（発行・一覧・失効・使用）
│   │   └── shift.ts            # シフト（取得・登録・削除）
│   ├── industries/
│   │   └── transport/          # 運送業固有のビジネスロジック
│   │       ├── billable.ts     # 運行実績（申請・承認・却下・VOID・削除）
│   │       ├── dashboard.ts    # ダッシュボード集計
│   │       ├── invoice.ts      # 請求書生成
│   │       ├── master.ts       # マスタCRUD（荷主・ルート・運賃・車両・経費区分）
│   │       └── templates/      # 帳票テンプレート
│   ├── api-error.ts            # API エラーハンドリング共通関数
│   └── format.ts               # 日付・金額・エラーメッセージのフォーマット
├── supabase/
│   └── migrations/             # DB マイグレーション SQL（追加のみ・編集禁止）
└── docs/
    ├── business_strategy.md    # 事業展開プラン
    └── customer_diff_log.md    # 顧客ごとの差分ログ（必ず記録を続ける）
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
| `companies` | テナント管理。`industry`・`custom_settings`・`is_demo` カラムを持つ |
| `employees` | ユーザー・ロール管理（DRIVER / ADMIN / OWNER） |
| `emp_requests` | 社員登録申請（PENDING / APPROVED / REJECTED） |
| `invite_tokens` | 招待リンク用トークン（有効期限7日・is_active管理） |
| `customers` | 荷主マスタ |
| `routes` | 運行ルートマスタ（積み地・降ろし地のデフォルト値を持つ） |
| `ratecards` | ルート別単価（UNIQUE: company_id + route_id） |
| `vehicles` | 車両マスタ |
| `billables` | 運行実績（REVIEW_REQUIRED / APPROVED / VOID） |
| `expense_categories` | 経費区分マスタ |
| `expenses` | 経費申請（SUBMITTED / APPROVED / REJECTED / REWORK_REQUIRED / PAID） |
| `attendances` | 勤怠記録（SUBMITTED / APPROVED / REJECTED） |
| `shifts` | 週間シフト（UNIQUE: company_id + emp_id + shift_date） |
| `monthly_closings` | 月次締め管理 |
| `payrolls` | 給与計算結果 |
| `todos` | Todo本体（個人・割り当て共通。物理削除） |
| `todo_assignments` | 割り当てTodoの受信者別ステータス（confirmed_at・completed_at） |
| `push_subscriptions` | Web Push購読情報（UNIQUE: emp_id + endpoint） |

### companies テーブルの重要カラム
```sql
industry       text DEFAULT 'transport'   -- 業種識別子
custom_settings jsonb DEFAULT '{}'        -- 顧客カスタム設定
is_demo        boolean DEFAULT false      -- デモ会社フラグ（true=自動DRIVER登録）
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
| `007_companies_extensions.sql` | companies に industry / custom_settings / is_demo 追加 |
| `008_shifts.sql` | シフトテーブル + RLS |
| `009_invite_tokens.sql` | 招待トークンテーブル + RLS |
| `010_todos.sql` | todos・todo_assignments・push_subscriptions テーブル + RLS |

---

## 認証・ログインフロー

```
Google OAuth
  → auth/callback（next パラメータを引き継ぐ）
  → auth/post-login
      ├─ employees に登録済み → ロール別トップへ
      ├─ emp_requests に PENDING あり → /pending
      ├─ is_demo=true の会社 → demo-register で DRIVER 自動登録 → /
      └─ 通常会社（is_demo=false）→ /register（申請フォーム）

招待リンク（/invite?token=xxx）
  → 未ログイン → Google OAuth（next=/invite?token=xxx で戻る）
  → 名前入力 → /api/invite → emp_requests に PENDING 登録 → /pending
```

---

## ロール設計と権限

| ロール | 主な権限 |
|---|---|
| `DRIVER` | 自分の実績・経費・勤怠の申請と取り消し。シフト閲覧（自分のみ） |
| `ADMIN` | 承認・却下・削除。マスタ管理。全員のシフト編集。招待リンク発行 |
| `OWNER` | ADMIN の全権限 + ダッシュボード + 月次締め + 給与計算 |

### ステータス遷移と操作者

| データ | 申請者ができること | ADMIN/OWNER ができること |
|---|---|---|
| 実績（billable） | 登録のみ | 承認・却下（再提出）・VOID・削除（VOID のみ） |
| 経費（expense） | 申請・取り消し（SUBMITTED のみ） | 承認・却下・削除（REJECTED のみ） |
| 勤怠（attendance） | 申請・取り消し（SUBMITTED のみ） | 承認・却下・削除（REJECTED のみ） |
| シフト（shift） | 閲覧のみ（自分のみ） | 作成・編集・削除（全員分） |

---

## 主要機能の実装状況

| 機能 | 状態 | 備考 |
|---|---|---|
| Google OAuth ログイン | ✅ 完成 | |
| 招待リンクによる社員登録 | ✅ 完成 | 管理画面から発行・失効 |
| 運行実績入力・承認 | ✅ 完成 | 承認時に運賃マスタから金額自動補完 |
| 経費申請・承認 | ✅ 完成 | 領収書アップロード対応 |
| 勤怠申請・承認 | ✅ 完成 | 月次締め後は入力ロック |
| 週間シフト管理 | ✅ 完成 | ADMIN/OWNER編集・DRIVER閲覧のみ |
| マスタ管理 | ✅ 完成 | 荷主・ルート・運賃・車両・経費区分 |
| 月次締め | ✅ 完成 | 締め後は実績・経費・勤怠の新規入力をブロック |
| 給与計算 | ✅ 完成 | 月給・時給対応。勤怠データから自動計算 |
| 請求書生成 | ✅ 完成 | |
| 経営ダッシュボード | ✅ 完成 | OWNER専用。KPI・推移・社員別実績 |
| CSV エクスポート | ✅ 完成 | 実績・経費・勤怠。社員名カラム含む |
| Todo管理（個人・割り当て） | ✅ 完成 | 確認済み/対応済み2段階・物理削除・期日超過赤表示 |
| Web Push通知 + PWA | ✅ 完成 | VAPID・Service Worker・Vercel Cron（朝8時リマインダー） |
| ヘッダー未読バッジ | ✅ 完成 | ベルアイコン・未確認件数をリアルタイム表示 |
| エラー監視（Axiom） | ✅ 完成 | next-axiomによるリクエスト・エラーログ |
| デモモード | 🔶 部分実装 | is_demo フラグで分岐するが、デモデータは未投入 |

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
- エラー処理: `apiError()` 関数（`lib/api-error.ts`）で統一
- コメント: 日本語。関数の先頭に「何をする関数か」を1行で記載

### AI開発の限界を防ぐルール（重要）
- **1ファイル200行以内**を守る。超えたら分割を検討する
- **1関数30行以内**を目安にする
- コアと業種固有のロジックを混在させない（`lib/core/` と `lib/industries/` を使い分ける）
- 新しいテーブルや機能を追加したら必ずこの CLAUDE.md を更新する
- **既知の違反**: `admin-page-client.tsx`・`master-page-client.tsx` が 200 行超。将来的に分割する

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
- コミットメッセージ規約: `feat:` `fix:` `style:` `refactor:` `chore:` `docs:`
- `.env.local`、認証情報、秘密鍵、適用済み migration の直接編集結果はコミットしない
- `git push` の実行は、ユーザーの明示許可または当該会話内の明確な継続指示がある場合のみ
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
- `docs/business_strategy.md` — 事業展開プランの詳細
- `docs/customer_diff_log.md` — 顧客ごとの差分ログ（必ず記録を続ける）
