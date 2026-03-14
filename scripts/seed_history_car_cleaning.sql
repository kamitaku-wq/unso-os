-- =================================================================
-- FUNCTION カーリペア 履歴データ移行テンプレート
-- Google Sheets の Groups シート → cleaning_jobs テーブル
-- 実際のデータは CSV からマッピングして INSERT する
-- =================================================================

-- ■ 使い方:
-- 1. Google Sheets の Groups シートを CSV エクスポート
-- 2. 各行を下記 INSERT 文の形式に変換
-- 3. Supabase SQL Editor で実行

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
  -- 作業実績の移行（全データを APPROVED として登録）
  -- ================================================================
  -- フォーマット:
  -- INSERT INTO cleaning_jobs (
  --   company_id, job_id, work_date, ym,
  --   store_id, store_name, work_code, work_name,
  --   car_type_text, id_list_raw, qty, unit_price, amount,
  --   price_note, emp_id, status, approved_at, approved_by
  -- ) VALUES (
  --   v_cid, 'J-YYYYMMDD-XXXX', 'YYYY-MM-DD', 'YYYYMM',
  --   'GS-XX', '店舗名', 'work_code', '作業名',
  --   '車種', '車両ID\n車両ID', 台数, 単価, 金額,
  --   NULL, 'EMP001', 'APPROVED', '移行日時', 'SYSTEM'
  -- );

  -- === ここに実データの INSERT 文を追加 ===
  -- （CSV からの変換スクリプトで生成）

  RAISE NOTICE '履歴データ移行テンプレートです。実データを追加してください。';

END $$;
