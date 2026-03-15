-- =================================================================
-- デモ会社に清掃業務（カーリペア）のサンプルデータを追加
-- 運送業データ（012_demo_seed.sql）に加えて清掃業務も体験できるようにする
-- =================================================================

DO $$
DECLARE
  v_cid uuid;
  v_emp_id text;
BEGIN
  SELECT id INTO v_cid FROM companies WHERE is_demo = true LIMIT 1;
  IF v_cid IS NULL THEN
    RAISE NOTICE 'デモ会社が見つかりません。スキップします。';
    RETURN;
  END IF;

  -- デモ会社の OWNER の emp_id を取得（サンプルデータの報告者に使う）
  SELECT emp_id INTO v_emp_id FROM employees
    WHERE company_id = v_cid AND is_active = true
    ORDER BY created_at LIMIT 1;

  -- ================================================================
  -- 作業種別マスタ（works テーブル）
  -- ================================================================
  INSERT INTO works (company_id, work_code, name, default_unit_price, sort_order, note) VALUES
    (v_cid, 'pic',    '写真撮影',             3000,  1, NULL),
    (v_cid, 'incl',   '入庫仕上げ',           3000,  2, NULL),
    (v_cid, 'outcl',  '納車仕上げ',           3000,  3, NULL),
    (v_cid, 'auccl',  'オークション仕上げ',   3000,  4, NULL),
    (v_cid, 'sellcl', '商談仕上げ',           3000,  5, NULL),
    (v_cid, 'wash',   '拭きあげ洗車',          800,  6, NULL),
    (v_cid, 'wwash',  '水洗車',               1000,  7, NULL),
    (v_cid, 'tire',   'タイヤ',                500,  8, NULL),
    (v_cid, 'deo',    '消臭',                18000,  9, NULL),
    (v_cid, 'crackN', 'クラック除去国産',      8000, 10, NULL),
    (v_cid, 'crack',  'クラック除去輸入',     10000, 11, NULL),
    (v_cid, 'repair', 'リペア',               NULL, 12, '単価は案件ごとに設定'),
    (v_cid, 'other',  'その他',               NULL, 13, '単価は案件ごとに設定'),
    (v_cid, 'insp',   '予備',                 8000, 14, NULL)
  ON CONFLICT (company_id, work_code) DO UPDATE SET
    name = EXCLUDED.name,
    default_unit_price = EXCLUDED.default_unit_price,
    sort_order = EXCLUDED.sort_order;

  -- ================================================================
  -- 清掃用店舗（customers テーブルに追加）
  -- ================================================================
  INSERT INTO customers (company_id, cust_id, name, address) VALUES
    (v_cid, 'GS-KS', 'グッドスピード春日井店', '愛知県春日井市'),
    (v_cid, 'GS-TI', 'グッドスピード知立店',   '愛知県知立市'),
    (v_cid, 'GS-OG', 'グッドスピード大垣店',   '岐阜県大垣市'),
    (v_cid, 'GS-MT', 'グッドスピード名東店',   '愛知県名古屋市名東区'),
    (v_cid, 'GS-KM', 'グッドスピード小牧店',   '愛知県小牧市'),
    (v_cid, 'GS-BN', 'グッドスピードVANLIFE春日井店', '愛知県春日井市')
  ON CONFLICT (company_id, cust_id) DO UPDATE SET name = EXCLUDED.name;

  -- ================================================================
  -- 経費区分マスタ（デモ会社に追加）
  -- ================================================================
  INSERT INTO expense_categories (company_id, category_id, name, is_active) VALUES
    (v_cid, 'gas',    'ガソリン',       true),
    (v_cid, 'cons',   '消耗品',         true),
    (v_cid, 'highw',  '高速',           true),
    (v_cid, 'enterm', '接待交際費',     true),
    (v_cid, 'other',  'その他',         true)
  ON CONFLICT (company_id, category_id) DO UPDATE SET name = EXCLUDED.name;

  -- ================================================================
  -- サンプル清掃作業実績（3月分・承認済み）
  -- ================================================================
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO cleaning_jobs (
      company_id, job_id, work_date, ym,
      store_id, store_name, work_code, work_name,
      car_type_text, id_list_raw, qty, unit_price, amount,
      emp_id, status, approved_at, approved_by
    ) VALUES
      (v_cid, 'J-20260301-0001', '2026-03-01', '202603',
       'GS-KS', 'グッドスピード春日井店', 'incl', '入庫仕上げ',
       'プリウス', '2401100001', 1, 3000, 3000,
       v_emp_id, 'APPROVED', NOW(), 'SYSTEM'),
      (v_cid, 'J-20260301-0002', '2026-03-01', '202603',
       'GS-KS', 'グッドスピード春日井店', 'wash', '拭きあげ洗車',
       'フィット', '2401100002' || E'\n' || '2401100003', 2, 800, 1600,
       v_emp_id, 'APPROVED', NOW(), 'SYSTEM'),
      (v_cid, 'J-20260305-0001', '2026-03-05', '202603',
       'GS-TI', 'グッドスピード知立店', 'outcl', '納車仕上げ',
       'アクア', '2402200001', 1, 3000, 3000,
       v_emp_id, 'APPROVED', NOW(), 'SYSTEM'),
      (v_cid, 'J-20260305-0002', '2026-03-05', '202603',
       'GS-OG', 'グッドスピード大垣店', 'deo', '消臭',
       'ヴォクシー', '2403300001', 1, 18000, 18000,
       v_emp_id, 'APPROVED', NOW(), 'SYSTEM'),
      (v_cid, 'J-20260310-0001', '2026-03-10', '202603',
       'GS-KM', 'グッドスピード小牧店', 'pic', '写真撮影',
       'CX-5', '2404400001' || E'\n' || '2404400002' || E'\n' || '2404400003', 3, 3000, 9000,
       v_emp_id, 'APPROVED', NOW(), 'SYSTEM'),
      -- 未承認（REVIEW_REQUIRED）のサンプルも1件
      (v_cid, 'J-20260314-0001', '2026-03-14', '202603',
       'GS-MT', 'グッドスピード名東店', 'crackN', 'クラック除去国産',
       'レクサスNX', '2405500001', 1, 8000, 8000,
       v_emp_id, 'REVIEW_REQUIRED', NULL, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- custom_settings を更新：cleaning_job を有効化
  -- 既存設定を保持しつつ cleaning_job を追加
  -- ================================================================
  UPDATE companies SET custom_settings = COALESCE(custom_settings, '{}'::jsonb)
    || jsonb_build_object(
      'enabled_features', COALESCE(custom_settings->'enabled_features', '{}'::jsonb)
        || '{"cleaning_job": true}'::jsonb
    )
  WHERE id = v_cid;

  RAISE NOTICE 'デモ会社に清掃業務データを追加しました（company_id: %）', v_cid;
END $$;
