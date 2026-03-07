# CLAUDE.md

## このファイルについて
Claude Code / Cursor Agent がプロジェクトを理解するための設定書。
セッション開始時に自動で読み込まれる。

---

## プロジェクト概要
**unso-os（運送OS）** — Next.js + Supabase 版の現場経営システム。
GAS 版（C:/Users/kamit/FUNCTION_cursor/）の後継プロジェクト。
運送業向けを標準とし、他業種へのカスタマイズ販売を目的とした SaaS 型業務システム。

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
- **フロントエンド**: Next.js 14+ (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth + Google OAuth
- **ホスティング**: Vercel
- **ローカル開発**: `npm run dev` → localhost:3000

---

## ディレクトリ構成

```
unso-os/
├── CLAUDE.md               # このファイル
├── .cursorrules            # Cursor 用ルール
├── .gitignore
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 共通レイアウト
│   ├── page.tsx            # 運行実績入力（旧 Index.html）
│   ├── admin/page.tsx      # 管理者承認画面（旧 Admin.html）
│   ├── dashboard/page.tsx  # 経営ダッシュボード（旧 Dashboard.html）
│   ├── expense/page.tsx    # 経費申請（旧 Expense.html）
│   ├── master/page.tsx     # マスタ管理（旧 Master.html）
│   ├── attendance/page.tsx # 勤怠管理（旧 AttendanceAdmin.html）
│   └── api/                # Route Handlers（サーバー API）
│       ├── billable/
│       ├── expense/
│       ├── master/
│       └── attendance/
├── components/
│   ├── ui/                 # shadcn/ui コンポーネント
│   └── features/           # 機能別コンポーネント
├── lib/
│   ├── supabase/           # Supabase クライアント設定
│   ├── server/             # サーバー側ビジネスロジック
│   │   ├── billable.ts     # 旧 BillableLogic.js 相当
│   │   ├── expense.ts      # 旧 ExpenseLogic.js 相当
│   │   ├── master.ts       # 旧 MasterLogic.js 相当
│   │   └── attendance.ts   # 旧 AttendanceLogic.js 相当
│   ├── config.ts           # 旧 Config.js 相当
│   └── utils.ts            # 共通ユーティリティ（旧 _Components.html 相当）
├── supabase/
│   └── migrations/         # DB マイグレーション SQL
└── docs/                   # ドキュメント
```

---

## データベース設計

### マルチテナント方針
- 1 Supabase プロジェクトで複数クライアントを対応
- Row Level Security (RLS) で `company_id` ごとにデータを完全分離
- 全テーブルに `company_id uuid` カラムを持つ

### テーブル一覧
| テーブル名 | 旧シート名 | 内容 |
|---|---|---|
| `companies` | なし（新規） | テナント（クライアント会社）管理 |
| `employees` | 社員マスタ | ユーザー・ロール管理 |
| `emp_requests` | 社員申請 | 社員登録申請 |
| `customers` | 荷主マスタ | 取引先 |
| `routes` | ルートマスタ | 運行ルート |
| `ratecards` | 運賃マスタ | ルート別単価 |
| `vehicles` | 車両マスタ | 車両情報 |
| `billables` | 実績（請求対象） | 運行実績・請求管理 |
| `expense_categories` | 経費区分マスタ | 経費の分類 |
| `expenses` | 経費申請 | 経費申請・承認 |
| `attendances` | 勤怠 | 勤怠記録 |

詳細スキーマ（SQL）: `C:/Users/kamit/FUNCTION_cursor/docs/next_architecture.md`

---

## ロール設計（旧プロジェクトから継続）
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
- 言語: TypeScript（strict モード）
- コンポーネント: React Server Components を基本とし、操作が必要な部分のみ `'use client'`
- スタイル: Tailwind CSS + shadcn/ui コンポーネントを優先使用
- API: Next.js Route Handler（`app/api/*/route.ts`）
- DB アクセス: Supabase JS クライアント経由
- エラー処理: try-catch で包み、ユーザーにわかるメッセージを返す
- 1関数30行以内を目安
- コメント: 日本語。関数の先頭に「何をする関数か」を1行で記載

---

## エージェント分業ルール

### Claude Code が担当
| 作業 | 具体例 |
|---|---|
| DB スキーマ・マイグレーション SQL | テーブル追加、RLS ポリシー設定 |
| 認証・権限設計 | ロール判定、アクセス制御 |
| API Route Handler の新規作成 | `app/api/*/route.ts` |
| `lib/server/` のビジネスロジック | 集計・承認・締め処理 |
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
- `git push` はユーザーの指示があった場合のみ
- remote 未設定や push 失敗を見つけたら、その場で原因と不足情報をユーザーに伝える
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
