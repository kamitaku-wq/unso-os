-- companies テーブルの拡張
-- industry: 業種識別子（将来の業種別モジュール切替に使用）
-- custom_settings: 顧客ごとのカスタム設定（ラベル・機能ON/OFF・帳票テンプレート等）
-- is_demo: デモ会社フラグ（true の場合のみロール切替スイッチャーを表示）

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS industry text DEFAULT 'transport',
  ADD COLUMN IF NOT EXISTS custom_settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

COMMENT ON COLUMN companies.industry IS '業種識別子: transport / construction / general など';
COMMENT ON COLUMN companies.custom_settings IS '顧客ごとの設定JSON: labels / features / report_template など';
COMMENT ON COLUMN companies.is_demo IS 'デモ会社フラグ: true のときのみロール切替スイッチャーを表示';
