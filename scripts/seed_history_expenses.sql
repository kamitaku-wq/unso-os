-- =================================================================
-- FUNCTION カーリペア 経費履歴データ移行テンプレート
-- Google Sheets の経費申請一覧 → expenses テーブル
-- レシート画像は Google Drive URL をそのまま receipt_url に格納
-- =================================================================

DO $$
DECLARE
  v_cid uuid;
BEGIN
  SELECT id INTO v_cid FROM companies
    WHERE custom_settings->>'app_name' = 'FUNCTION カーリペア'
    LIMIT 1;

  IF v_cid IS NULL THEN
    RAISE EXCEPTION 'FUNCTION カーリペアの会社が見つかりません';
  END IF;

  -- ================================================================
  -- 経費の移行（全データを APPROVED として登録）
  -- receipt_synced = true（既に Drive 上にあるため転送不要）
  -- ================================================================
  -- フォーマット:
  -- INSERT INTO expenses (
  --   company_id, expense_id, emp_id, expense_date, ym,
  --   category_id, category_name, amount, vendor, description,
  --   receipt_url, receipt_synced,
  --   status, submitted_at, approved_at, approved_by
  -- ) VALUES (
  --   v_cid, 'EXP-YYYYMMDD-XXXX', 'EMP001', 'YYYY-MM-DD', 'YYYYMM',
  --   'gas', 'ガソリン', 5000, '店名', '説明',
  --   'https://drive.google.com/...', true,
  --   'APPROVED', '移行日時', '移行日時', 'SYSTEM'
  -- );

  -- === ここに実データの INSERT 文を追加 ===

  RAISE NOTICE '経費履歴データ移行テンプレートです。実データを追加してください。';

END $$;
