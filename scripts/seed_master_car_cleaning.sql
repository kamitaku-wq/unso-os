-- =================================================================
-- FUNCTION カーリペア マスタデータ登録
-- Supabase SQL Editor で実行してください
-- 事前に companies テーブルに会社を登録し、OWNER 社員を作成済みであること
-- =================================================================

DO $$
DECLARE
  v_cid uuid;
BEGIN
  -- 対象会社を取得（1社のみの場合は LIMIT 1 で取得）
  -- ※ 複数会社がある場合は WHERE id = '会社のUUID' で絞ること
  SELECT id INTO v_cid FROM companies LIMIT 1;

  IF v_cid IS NULL THEN
    RAISE EXCEPTION '会社が見つかりません。先に /setup から会社を登録してください。';
  END IF;

  -- ================================================================
  -- 店舗マスタ（customers テーブル）
  -- ================================================================
  INSERT INTO customers (company_id, cust_id, name, address) VALUES
    (v_cid, 'GS-KS', '株式会社グッドスピード春日井店',        NULL),
    (v_cid, 'GS-TI', '株式会社グッドスピード知立店',          NULL),
    (v_cid, 'GS-OG', '株式会社グッドスピード大垣店',          NULL),
    (v_cid, 'GS-ND', '株式会社グッドスピード名東店',          NULL),
    (v_cid, 'GS-KM', '株式会社グッドスピード小牧店',          NULL),
    (v_cid, 'GS-VK', '株式会社グッドスピードVANLIFE春日井店', NULL)
  ON CONFLICT (company_id, cust_id) DO UPDATE SET name = EXCLUDED.name;

  -- ================================================================
  -- 作業種別マスタ（works テーブル）15種
  -- ================================================================
  INSERT INTO works (company_id, work_code, name, default_unit_price, note) VALUES
    (v_cid, 'pic',    '写真撮影',             3000, NULL),
    (v_cid, 'incl',   '入庫仕上げ',           3000, NULL),
    (v_cid, 'outcl',  '納車仕上げ',           3000, NULL),
    (v_cid, 'auccl',  'オークション仕上げ',   3000, NULL),
    (v_cid, 'sellcl', '商談仕上げ',           3000, NULL),
    (v_cid, 'wash',   '拭きあげ洗車',          800, NULL),
    (v_cid, 'wwash',  '水洗車',               1000, NULL),
    (v_cid, 'tire',   'タイヤ',                500, NULL),
    (v_cid, 'deo',    '消臭',                18000, NULL),
    (v_cid, 'crackN', 'クラック除去国産',      8000, NULL),
    (v_cid, 'crack',  'クラック除去輸入',     10000, NULL),
    (v_cid, 'repair', 'リペア',               NULL, '単価は案件ごとに設定'),
    (v_cid, 'other',  'その他',               NULL, '単価は案件ごとに設定'),
    (v_cid, 'insp',   '予備',                 8000, NULL)
  ON CONFLICT (company_id, work_code) DO UPDATE SET
    name = EXCLUDED.name,
    default_unit_price = EXCLUDED.default_unit_price;

  -- ================================================================
  -- 経費区分マスタ（expense_categories テーブル）
  -- ================================================================
  INSERT INTO expense_categories (company_id, category_id, name, is_active) VALUES
    (v_cid, 'gas',    'ガソリン',       true),
    (v_cid, 'cons',   '消耗品',         true),
    (v_cid, 'highw',  '高速',           true),
    (v_cid, 'enterm', '接待交際費',     true),
    (v_cid, 'other',  'その他',         true)
  ON CONFLICT (company_id, category_id) DO UPDATE SET name = EXCLUDED.name;

  -- ================================================================
  -- 会社設定を更新（enabled_features + app_name）
  -- ================================================================
  UPDATE companies SET custom_settings = jsonb_build_object(
    'app_name', 'FUNCTION カーリペア',
    'enabled_features', jsonb_build_object(
      'cleaning_job', true,
      'billable', false,
      'expense', true,
      'attendance', true,
      'shift', true,
      'invoice', true,
      'payroll', true,
      'dashboard', true,
      'todo', true
    )
  ) WHERE id = v_cid;

END $$;

-- 確認
SELECT 'stores' AS type, COUNT(*) AS cnt FROM customers WHERE company_id = (SELECT id FROM companies WHERE id = (SELECT id FROM companies LIMIT 1))
UNION ALL
SELECT 'works', COUNT(*) FROM works WHERE company_id = (SELECT id FROM companies WHERE id = (SELECT id FROM companies LIMIT 1))
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM expense_categories WHERE company_id = (SELECT id FROM companies WHERE id = (SELECT id FROM companies LIMIT 1));
