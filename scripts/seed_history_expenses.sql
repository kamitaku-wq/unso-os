-- =================================================================
-- 経費データ移行（旧システム → expenses テーブル）
-- Supabase SQL Editor で実行してください
-- 事前に companies / employees テーブルにデータが存在すること
-- =================================================================

DO $$
DECLARE
  v_cid uuid;
  v_emp_kamiya text;
  v_emp_seibu text;
  v_emp_tazawa text;
  v_emp_hiramatsu text;
BEGIN
  -- 本番会社を取得
  SELECT id INTO v_cid FROM companies WHERE is_demo = false LIMIT 1;
  IF v_cid IS NULL THEN
    RAISE EXCEPTION '会社が見つかりません。';
  END IF;

  -- 社員IDを取得
  SELECT emp_id INTO v_emp_kamiya FROM employees WHERE company_id = v_cid AND name LIKE '%神谷%';
  SELECT emp_id INTO v_emp_seibu FROM employees WHERE company_id = v_cid AND name LIKE '%西部%';
  SELECT emp_id INTO v_emp_tazawa FROM employees WHERE company_id = v_cid AND name LIKE '%田澤%';
  SELECT emp_id INTO v_emp_hiramatsu FROM employees WHERE company_id = v_cid AND name LIKE '%平松%';

  IF v_emp_kamiya IS NULL THEN RAISE EXCEPTION '神谷 が見つかりません'; END IF;
  IF v_emp_seibu IS NULL THEN RAISE EXCEPTION '西部 が見つかりません'; END IF;
  IF v_emp_tazawa IS NULL THEN RAISE EXCEPTION '田澤 が見つかりません'; END IF;
  IF v_emp_hiramatsu IS NULL THEN RAISE EXCEPTION '平松 が見つかりません'; END IF;

  -- ================================================================
  -- 経費データ挿入（134件）
  -- ================================================================
  INSERT INTO expenses (
    company_id, expense_id, emp_id, status, submitted_at, ym,
    expense_date, category_id, category_name, amount, vendor,
    description, receipt_url, receipt_synced, extra_fields,
    approved_at, approved_by
  ) VALUES
    -- 1: 464169d6 神谷 cons 確定
    (v_cid, 'E-20260115-4641', v_emp_kamiya, 'APPROVED', '2026-01-18T23:06:51.883Z'::timestamptz, '202601',
     '2026-01-15', 'cons', '消耗品', 580, 'ワークマン岐阜則武店',
     '手袋', 'https://drive.google.com/uc?id=1TI2dt1BtJMMSSqSYw5SISl0pR3KdvXJ5&export=download', true, '{"details_text":"手袋"}'::jsonb,
     '2026-01-18T23:06:51.883Z'::timestamptz, NULL),

    -- 2: 325536d5 神谷 gas 確定
    (v_cid, 'E-20260113-3255', v_emp_kamiya, 'APPROVED', '2026-01-18T23:10:58.481Z'::timestamptz, '202601',
     '2026-01-13', 'gas', 'ガソリン', 5870, '東栄事業株式会社',
     NULL, 'https://drive.google.com/file/d/1IuhkUeWyhhrV7NAmy-d7y8tLJ8e8wG_K/view?usp=drivesdk', true, '{"gas_liters":"39.93"}'::jsonb,
     '2026-01-18T23:10:58.481Z'::timestamptz, NULL),

    -- 3: 4e7dbf13 神谷 gas 確定
    (v_cid, 'E-20260106-4E7D', v_emp_kamiya, 'APPROVED', '2026-01-18T23:12:54.880Z'::timestamptz, '202601',
     '2026-01-06', 'gas', 'ガソリン', 1000, 'コスモ石油',
     NULL, 'https://drive.google.com/file/d/162OrfxvBelaGEvrF9PmCSKKmtTU70Mux/view?usp=drivesdk', true, '{"gas_liters":"7.25"}'::jsonb,
     '2026-01-18T23:12:54.880Z'::timestamptz, NULL),

    -- 4: 28b384de 神谷 gas 確定
    (v_cid, 'E-20260106-28B3', v_emp_kamiya, 'APPROVED', '2026-01-18T23:15:00.199Z'::timestamptz, '202601',
     '2026-01-06', 'gas', 'ガソリン', 1000, 'コスモ石油',
     NULL, 'https://drive.google.com/file/d/1fKJPHFY8NhCbdLDDPCeK_PxqN7u7YbMl/view?usp=drivesdk', true, '{"gas_liters":"7.25"}'::jsonb,
     '2026-01-18T23:15:00.199Z'::timestamptz, NULL),

    -- 5: 5fdd99a7 神谷 gas 確定
    (v_cid, 'E-20260109-5FDD', v_emp_kamiya, 'APPROVED', '2026-01-18T23:16:13.642Z'::timestamptz, '202601',
     '2026-01-09', 'gas', 'ガソリン', 1000, 'アポロステーション',
     NULL, 'https://drive.google.com/file/d/1m8_lPF_dLMDPHUURpVb-nhQ5ej-cYIYq/view?usp=drivesdk', true, '{"gas_liters":"6.8"}'::jsonb,
     '2026-01-18T23:16:13.642Z'::timestamptz, NULL),

    -- 6: 7ebdfa81 神谷 gas 確定
    (v_cid, 'E-20251231-7EBD', v_emp_kamiya, 'APPROVED', '2026-01-18T23:45:50.644Z'::timestamptz, '202512',
     '2025-12-31', 'gas', 'ガソリン', 4900, 'selfix',
     NULL, 'https://drive.google.com/uc?id=146IDe_zDqTLrVvSnvcZvFGVvJW2saARD&export=download', true, '{"gas_liters":"35"}'::jsonb,
     '2026-01-18T23:45:50.644Z'::timestamptz, NULL),

    -- 7: e433608c 神谷 enterm 確定
    (v_cid, 'E-20260119-E433', v_emp_kamiya, 'APPROVED', '2026-01-19T23:07:42.639Z'::timestamptz, '202601',
     '2026-01-19', 'enterm', '接待交際費', 1320, 'コメダ珈琲',
     '作業のため', 'https://drive.google.com/uc?id=1g8A1foWvptfnrEdRL5iMlKFn7st-oRKc&export=download', true, '{"details_text":"作業のため"}'::jsonb,
     '2026-01-19T23:07:42.639Z'::timestamptz, NULL),

    -- 8: a7b9e52b 神谷 cons 確定
    (v_cid, 'E-20260122-A7B9', v_emp_kamiya, 'APPROVED', '2026-01-22T00:55:21.372Z'::timestamptz, '202601',
     '2026-01-22', 'cons', '消耗品', 2459, 'ワークマン',
     '手袋\n靴下', 'https://drive.google.com/file/d/1y7GKdivEmtluaDuypLZVZ_-spSOUcVQB/view?usp=drivesdk', true, '{"details_text":"手袋\n靴下"}'::jsonb,
     '2026-01-22T00:55:21.372Z'::timestamptz, NULL),

    -- 9: 986611cc 西部 gas 確定
    (v_cid, 'E-20260124-9866', v_emp_seibu, 'APPROVED', '2026-01-24T13:47:54.859Z'::timestamptz, '202601',
     '2026-01-24', 'gas', 'ガソリン', 3000, '(有)ケイエムエナジー　　美濃加茂',
     NULL, 'https://drive.google.com/file/d/1JXM4_GkkIhegReRrKhgA-ee195tV-RDW/view?usp=drivesdk', true, '{"gas_liters":"20.69"}'::jsonb,
     '2026-01-24T13:47:54.859Z'::timestamptz, NULL),

    -- 10: 01693fc7 西部 gas 確定
    (v_cid, 'E-20251216-0169', v_emp_seibu, 'APPROVED', '2026-01-24T13:51:45.540Z'::timestamptz, '202512',
     '2025-12-16', 'gas', 'ガソリン', 2000, 'アポロステーション',
     NULL, 'https://drive.google.com/file/d/1csngY4DAqABzF7TGIfvzFA-cw14NwgXw/view?usp=drivesdk', true, '{"gas_liters":"13.33"}'::jsonb,
     '2026-01-24T13:51:45.540Z'::timestamptz, NULL),

    -- 11: 3fa19281 西部 gas 確定
    (v_cid, 'E-20251214-3FA1', v_emp_seibu, 'APPROVED', '2026-01-24T13:55:16.336Z'::timestamptz, '202512',
     '2025-12-14', 'gas', 'ガソリン', 2000, '三愛リテールサービス株式会社(エネジェット)',
     NULL, 'https://drive.google.com/file/d/1y8ICGSMfs7y0Ma6SpNb3QEPqbzHv2dfi/view?usp=drivesdk', true, '{"gas_liters":"13.7"}'::jsonb,
     '2026-01-24T13:55:16.336Z'::timestamptz, NULL),

    -- 12: 94587e17 田澤 highw 確定
    (v_cid, 'E-20251222-9458', v_emp_tazawa, 'APPROVED', '2026-01-24T17:23:45.926Z'::timestamptz, '202512',
     '2025-12-22', 'highw', '高速', 1900, '春日井店',
     NULL, 'https://drive.google.com/uc?id=1vntOWDuV22dIEkpSjFoA90kCys7hjU-F&export=download', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     '2026-01-24T17:23:45.926Z'::timestamptz, NULL),

    -- 13: 47634118 田澤 highw 確定
    (v_cid, 'E-20251222-4763', v_emp_tazawa, 'APPROVED', '2026-01-24T17:25:12.731Z'::timestamptz, '202512',
     '2025-12-22', 'highw', '高速', 1510, '春日井',
     NULL, 'https://drive.google.com/file/d/1yXlqF7vFWb0QMCqngFhmn1gtzXUC6r-u/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T17:25:12.731Z'::timestamptz, NULL),

    -- 14: 37e39474 田澤 highw 確定
    (v_cid, 'E-20251226-37E3', v_emp_tazawa, 'APPROVED', '2026-01-24T17:27:43.535Z'::timestamptz, '202512',
     '2025-12-26', 'highw', '高速', 3110, '大垣',
     NULL, 'https://drive.google.com/file/d/1EGVRaeBT1_1LZiEc8IPqQV_cEwEQzIds/view?usp=drivesdk', true, '{"highw_in":"大垣","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T17:27:43.535Z'::timestamptz, NULL),

    -- 15: 37d82473 田澤 highw 確定
    (v_cid, 'E-20251226-37D8', v_emp_tazawa, 'APPROVED', '2026-01-24T17:28:47.870Z'::timestamptz, '202512',
     '2025-12-26', 'highw', '高速', 3110, '大垣',
     NULL, 'https://drive.google.com/file/d/1rBe-5NXUcdgvGLqQltRqp9-bbE5Wy9AI/view?usp=drivesdk', true, '{"highw_in":"大垣","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T17:28:47.870Z'::timestamptz, NULL),

    -- 16: 55736757 田澤 other 確定
    (v_cid, 'E-20251220-5573', v_emp_tazawa, 'APPROVED', '2026-01-24T17:31:44.803Z'::timestamptz, '202512',
     '2025-12-20', 'other', 'その他', 4598, '春日井',
     '長靴\n手袋', 'https://drive.google.com/uc?id=1AHXseKsPG8N0sUjphGPSxkkZVmE9vPIp&export=download', true, '{"details_text":"長靴\n手袋"}'::jsonb,
     '2026-01-24T17:31:44.803Z'::timestamptz, NULL),

    -- 17: 3c3026ed 田澤 cons 確定
    (v_cid, 'E-20251221-3C30', v_emp_tazawa, 'APPROVED', '2026-01-24T17:33:11.375Z'::timestamptz, '202512',
     '2025-12-21', 'cons', '消耗品', 480, '名東',
     '紙ヤスリ', 'https://drive.google.com/uc?id=1K98UWP3pktD_7s8sdmEPFxYby8QEjqEd&export=download', true, '{"details_text":"紙ヤスリ"}'::jsonb,
     '2026-01-24T17:33:11.375Z'::timestamptz, NULL),

    -- 18: 0013f5fc 田澤 other 確定
    (v_cid, 'E-20251211-0013', v_emp_tazawa, 'APPROVED', '2026-01-24T17:35:27.123Z'::timestamptz, '202512',
     '2025-12-11', 'other', 'その他', 550, '春日井',
     '車内用の清掃道具', 'https://drive.google.com/file/d/1iiWMo17TnKjvjh3rUZjIyxF4ilBTvCNu/view?usp=drivesdk', true, '{"details_text":"車内用の清掃道具"}'::jsonb,
     '2026-01-24T17:35:27.123Z'::timestamptz, NULL),

    -- 19: 53e5fc85 田澤 other 確定
    (v_cid, 'E-20251212-53E5', v_emp_tazawa, 'APPROVED', '2026-01-24T17:37:38.752Z'::timestamptz, '202512',
     '2025-12-12', 'other', 'その他', 4378, '春日井',
     'モップ絞り器', 'https://drive.google.com/file/d/1rWwV9smzjm0vpCMqiaUcfedMolpw5M9C/view?usp=drivesdk', true, '{"details_text":"モップ絞り器"}'::jsonb,
     '2026-01-24T17:37:38.752Z'::timestamptz, NULL),

    -- 20: 1bc91304 田澤 cons 確定
    (v_cid, 'E-20251211-1BC9', v_emp_tazawa, 'APPROVED', '2026-01-24T17:39:12.491Z'::timestamptz, '202512',
     '2025-12-11', 'cons', '消耗品', 3278, '春日井',
     '洗車用タオル', 'https://drive.google.com/file/d/1fioAh-2HlIblrbe-OlPunr9CDQgIXGw0/view?usp=drivesdk', true, '{"details_text":"洗車用タオル"}'::jsonb,
     '2026-01-24T17:39:12.491Z'::timestamptz, NULL),

    -- 21: b7687203 田澤 other 確定
    (v_cid, 'E-20251209-B768', v_emp_tazawa, 'APPROVED', '2026-01-24T17:41:58.887Z'::timestamptz, '202512',
     '2025-12-09', 'other', 'その他', 9840, '小牧',
     '洗車用のタオル、モップ', 'https://drive.google.com/file/d/1z2XKYemARKuhKHxcFIBIzJPnIhsk_FFO/view?usp=drivesdk', true, '{"details_text":"洗車用のタオル、モップ"}'::jsonb,
     '2026-01-24T17:41:58.887Z'::timestamptz, NULL),

    -- 22: bf1213fb 田澤 cons 確定
    (v_cid, 'E-20260110-BF12', v_emp_tazawa, 'APPROVED', '2026-01-24T17:44:49.190Z'::timestamptz, '202601',
     '2026-01-10', 'cons', '消耗品', 1596, '小牧',
     '洗車用の道具', 'https://drive.google.com/file/d/1cgZBaTpqzDfVCbB5ZnvTbb6Y7LhYOqrI/view?usp=drivesdk', true, '{"details_text":"洗車用の道具"}'::jsonb,
     '2026-01-24T17:44:49.190Z'::timestamptz, NULL),

    -- 23: 1ab4866c 田澤 cons 確定
    (v_cid, 'E-20260107-1AB4', v_emp_tazawa, 'APPROVED', '2026-01-24T17:48:02.219Z'::timestamptz, '202601',
     '2026-01-07', 'cons', '消耗品', 2769, 'DCM',
     '紙ヤスリ\nコンパウンド', 'https://drive.google.com/file/d/1Xwqxegxj6RVsypTDZJPZLTV16UI9uFQv/view?usp=drivesdk', true, '{"details_text":"紙ヤスリ\nコンパウンド"}'::jsonb,
     '2026-01-24T17:48:02.219Z'::timestamptz, NULL),

    -- 24: adacdfc0 田澤 cons 確定
    (v_cid, 'E-20251218-ADAC', v_emp_tazawa, 'APPROVED', '2026-01-24T17:50:03.768Z'::timestamptz, '202512',
     '2025-12-18', 'cons', '消耗品', 220, 'ダイソー',
     '毛玉取り', 'https://drive.google.com/file/d/182Ja7tKIIghVHqWWo6DaVGItR7ZneEll/view?usp=drivesdk', true, '{"details_text":"毛玉取り"}'::jsonb,
     '2026-01-24T17:50:03.768Z'::timestamptz, NULL),

    -- 25: 2a7d6f19 田澤 highw 確定
    (v_cid, 'E-20260125-2A7D', v_emp_tazawa, 'APPROVED', '2026-01-24T17:54:59.588Z'::timestamptz, '202601',
     '2026-01-25', 'highw', '高速', 2500, '小牧',
     NULL, 'https://drive.google.com/uc?id=1_yujqge48ObR1kNHSTJZGPz0Xpakj02b&export=download', true, '{"highw_in":"豊川","highw_out":"小牧"}'::jsonb,
     '2026-01-24T17:54:59.588Z'::timestamptz, NULL),

    -- 26: 88d3bbb8 田澤 highw 確定
    (v_cid, 'E-20251203-88D3', v_emp_tazawa, 'APPROVED', '2026-01-24T17:57:13.500Z'::timestamptz, '202512',
     '2025-12-03', 'highw', '高速', 310, '小牧',
     NULL, 'https://drive.google.com/file/d/1G3x79rKgMZglk-pW3cj_W_Fg6CTguYfR/view?usp=drivesdk', true, '{"highw_in":"小牧","highw_out":"堀の内出口"}'::jsonb,
     '2026-01-24T17:57:13.500Z'::timestamptz, NULL),

    -- 27: dba4db72 田澤 highw 確定
    (v_cid, 'E-20251203-DBA4', v_emp_tazawa, 'APPROVED', '2026-01-24T18:01:20.961Z'::timestamptz, '202512',
     '2025-12-03', 'highw', '高速', 300, '名東',
     NULL, 'https://drive.google.com/file/d/1VR-ZG3FTCoQCobI4eU73-Zoms7yXT8Dq/view?usp=drivesdk', true, '{"highw_in":"豊山南入口","highw_out":"楠至名二環"}'::jsonb,
     '2026-01-24T18:01:20.961Z'::timestamptz, NULL),

    -- 28: e7172a33 田澤 highw 確定
    (v_cid, 'E-20251203-E717', v_emp_tazawa, 'APPROVED', '2026-01-24T18:02:53.411Z'::timestamptz, '202512',
     '2025-12-03', 'highw', '高速', 610, '名東',
     NULL, 'https://drive.google.com/file/d/1UQawAHNH73tWokIVchqjJEbwaCyZnRWQ/view?usp=drivesdk', true, '{"highw_in":"楠JCT第一","highw_out":"東名名古屋"}'::jsonb,
     '2026-01-24T18:02:53.411Z'::timestamptz, NULL),

    -- 29: fb8d4850 田澤 highw 確定
    (v_cid, 'E-20251203-FB8D', v_emp_tazawa, 'APPROVED', '2026-01-24T18:05:03.463Z'::timestamptz, '202512',
     '2025-12-03', 'highw', '高速', 1510, '名東',
     NULL, 'https://drive.google.com/file/d/14kHfyjhW4zkmVxJdUyXU0iatFWMSo08Q/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T18:05:03.463Z'::timestamptz, NULL),

    -- 30: 72f0a2d5 田澤 highw 確定
    (v_cid, 'E-20251204-72F0', v_emp_tazawa, 'APPROVED', '2026-01-24T18:11:52.490Z'::timestamptz, '202512',
     '2025-12-04', 'highw', '高速', 1510, '名東',
     NULL, 'https://drive.google.com/file/d/1QKmX1q8VzmiFTVyqJHW4IuEGU9yFaNeD/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"名二環名古屋"}'::jsonb,
     '2026-01-24T18:11:52.490Z'::timestamptz, NULL),

    -- 31: 5896f0f8 田澤 highw 確定
    (v_cid, 'E-20251204-5896', v_emp_tazawa, 'APPROVED', '2026-01-24T18:12:43.798Z'::timestamptz, '202512',
     '2025-12-04', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1VIDxMQKCaut7306NhrBGchOHkRza6Zxf/view?usp=drivesdk', true, '{"highw_in":"名二環","highw_out":"引山"}'::jsonb,
     '2026-01-24T18:12:43.798Z'::timestamptz, NULL),

    -- 32: cf76d062 田澤 highw 確定
    (v_cid, 'E-20251204-CF76', v_emp_tazawa, 'APPROVED', '2026-01-24T18:13:30.378Z'::timestamptz, '202512',
     '2025-12-04', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1_CSCFL1f6IAMAUYctWWbYR7KcFhiRkV9/view?usp=drivesdk', true, '{"highw_in":"引山","highw_out":"東名名古屋"}'::jsonb,
     '2026-01-24T18:13:30.378Z'::timestamptz, NULL),

    -- 33: be5ed7e0 田澤 highw 確定
    (v_cid, 'E-20251204-BE5E', v_emp_tazawa, 'APPROVED', '2026-01-24T18:14:31.726Z'::timestamptz, '202512',
     '2025-12-04', 'highw', '高速', 1810, '名東',
     NULL, 'https://drive.google.com/file/d/1WNALrrQET_AKi0C2rE9zP2TiHJeg0ppB/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"豊川"}'::jsonb,
     '2026-01-24T18:14:31.726Z'::timestamptz, NULL),

    -- 34: 4cfbeae2 田澤 highw 確定
    (v_cid, 'E-20251207-4CFB', v_emp_tazawa, 'APPROVED', '2026-01-24T18:15:51.415Z'::timestamptz, '202512',
     '2025-12-07', 'highw', '高速', 1060, '名東',
     NULL, 'https://drive.google.com/file/d/1DzK2WwvzfZ1gJqF9CiaFIGKFZ6LNixAl/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"名二環名古屋"}'::jsonb,
     '2026-01-24T18:15:51.415Z'::timestamptz, NULL),

    -- 35: 61c9ed1a 田澤 highw 確定
    (v_cid, 'E-20251207-61C9', v_emp_tazawa, 'APPROVED', '2026-01-24T18:18:10.097Z'::timestamptz, '202512',
     '2025-12-07', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1P2iIsC7uqjR62p50DIZp8c0uZvqFA8Sb/view?usp=drivesdk', true, '{"highw_in":"名二環名古屋","highw_out":"引山"}'::jsonb,
     '2026-01-24T18:18:10.097Z'::timestamptz, NULL),

    -- 36: 447e834e 田澤 highw 確定
    (v_cid, 'E-20251207-447E', v_emp_tazawa, 'APPROVED', '2026-01-24T18:20:10.150Z'::timestamptz, '202512',
     '2025-12-07', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1-VjFHhJmfp0YOi4ehWzigZtnq4fhHnbK/view?usp=drivesdk', true, '{"highw_in":"引山","highw_out":"東名名古屋"}'::jsonb,
     '2026-01-24T18:20:10.150Z'::timestamptz, NULL),

    -- 37: 1ff5f1f8 田澤 highw 確定
    (v_cid, 'E-20251207-1FF5', v_emp_tazawa, 'APPROVED', '2026-01-24T18:20:56.190Z'::timestamptz, '202512',
     '2025-12-07', 'highw', '高速', 1060, '名東',
     NULL, 'https://drive.google.com/file/d/1tuybMFJIgrXL2uH7W_rE5zMhbhizIdL5/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T18:20:56.190Z'::timestamptz, NULL),

    -- 38: 0598adaa 田澤 highw 確定
    (v_cid, 'E-20251210-0598', v_emp_tazawa, 'APPROVED', '2026-01-24T18:22:17.914Z'::timestamptz, '202512',
     '2025-12-10', 'highw', '高速', 2200, '小牧',
     NULL, 'https://drive.google.com/file/d/1wwTzDNIi6wMX09xflc6wQt0AFy9AifLQ/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"小牧"}'::jsonb,
     '2026-01-24T18:22:17.914Z'::timestamptz, NULL),

    -- 39: 60c895df 田澤 highw 確定
    (v_cid, 'E-20251210-60C8', v_emp_tazawa, 'APPROVED', '2026-01-24T18:23:47.380Z'::timestamptz, '202512',
     '2025-12-10', 'highw', '高速', 310, '小牧',
     NULL, 'https://drive.google.com/file/d/1sPtC4T90S6Jk54yQyNZ5-WAyTDylqBOP/view?usp=drivesdk', true, '{"highw_in":"堀の内","highw_out":"小牧IC出口"}'::jsonb,
     '2026-01-24T18:23:47.380Z'::timestamptz, NULL),

    -- 40: 7f09fdb6 田澤 highw 確定
    (v_cid, 'E-20251210-7F09', v_emp_tazawa, 'APPROVED', '2026-01-24T18:24:29.670Z'::timestamptz, '202512',
     '2025-12-10', 'highw', '高速', 460, '春日井',
     NULL, 'https://drive.google.com/file/d/1XRoOEYgr6ThFA_BXKSUWWzSpCAkBmbvD/view?usp=drivesdk', true, '{"highw_in":"小牧","highw_out":"春日井"}'::jsonb,
     '2026-01-24T18:24:29.670Z'::timestamptz, NULL),

    -- 41: 6dc64b0e 田澤 highw 確定
    (v_cid, 'E-20251210-6DC6', v_emp_tazawa, 'APPROVED', '2026-01-24T18:25:14.125Z'::timestamptz, '202512',
     '2025-12-10', 'highw', '高速', 1900, '春日井',
     NULL, 'https://drive.google.com/file/d/1pMoK1tg9r98m4vudv1c6-nRqsupA9mjh/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T18:25:14.125Z'::timestamptz, NULL),

    -- 42: a5150eaa 田澤 highw 確定
    (v_cid, 'E-20251211-A515', v_emp_tazawa, 'APPROVED', '2026-01-24T18:26:24.091Z'::timestamptz, '202512',
     '2025-12-11', 'highw', '高速', 1900, '春日井',
     NULL, 'https://drive.google.com/file/d/11_PPaaWG8PAH81plOMNaM7dUQLZPesuk/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     '2026-01-24T18:26:24.091Z'::timestamptz, NULL),

    -- 43: cf7082a8 田澤 highw 確定
    (v_cid, 'E-20251211-CF70', v_emp_tazawa, 'APPROVED', '2026-01-24T18:27:44.739Z'::timestamptz, '202512',
     '2025-12-11', 'highw', '高速', 1900, '春日井',
     NULL, 'https://drive.google.com/file/d/1Dlc7OrRdOtP6wf4DHXMNx3qwBguyCutK/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T18:27:44.739Z'::timestamptz, NULL),

    -- 44: b00ad9d2 田澤 highw 確定
    (v_cid, 'E-20251212-B00A', v_emp_tazawa, 'APPROVED', '2026-01-24T18:30:28.612Z'::timestamptz, '202512',
     '2025-12-12', 'highw', '高速', 1770, '春日井',
     NULL, 'https://drive.google.com/file/d/1RCfuwEudMgXbJmPe6TdJzSbHlhNdBoI6/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"守山スマート"}'::jsonb,
     '2026-01-24T18:30:28.612Z'::timestamptz, NULL),

    -- 45: 4f5f6fc3 田澤 highw 確定
    (v_cid, 'E-20251212-4F5F', v_emp_tazawa, 'APPROVED', '2026-01-24T18:31:31.057Z'::timestamptz, '202512',
     '2025-12-12', 'highw', '高速', 1460, '春日井',
     NULL, 'https://drive.google.com/file/d/176PUjCLSzK18mxahwTNS0X_fSlDkJxh1/view?usp=drivesdk', true, '{"highw_in":"豊田南第一","highw_out":"春日井"}'::jsonb,
     '2026-01-24T18:31:31.057Z'::timestamptz, NULL),

    -- 46: dbbb3407 田澤 highw 確定
    (v_cid, 'E-20251212-DBBB', v_emp_tazawa, 'APPROVED', '2026-01-24T18:32:32.135Z'::timestamptz, '202512',
     '2025-12-12', 'highw', '高速', 1900, '春日井',
     NULL, 'https://drive.google.com/file/d/1YbJUonTNwL_19csRgjVbhAg6gLt4qhSW/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T18:32:32.135Z'::timestamptz, NULL),

    -- 47: 24bcd475 田澤 highw 確定
    (v_cid, 'E-20251214-24BC', v_emp_tazawa, 'APPROVED', '2026-01-24T18:35:12.196Z'::timestamptz, '202512',
     '2025-12-14', 'highw', '高速', 1060, '名東',
     NULL, 'https://drive.google.com/file/d/1NKo0iiV536WlMJyVIk1UpsN6S-WVF14K/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"名二環名古屋"}'::jsonb,
     '2026-01-24T18:35:12.196Z'::timestamptz, NULL),

    -- 48: 4746bbff 田澤 highw 確定
    (v_cid, 'E-20251214-4746', v_emp_tazawa, 'APPROVED', '2026-01-24T18:36:38.290Z'::timestamptz, '202512',
     '2025-12-14', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/14N7q89O0qZh2fp4pcYXy9Akdauhk2TuX/view?usp=drivesdk', true, '{"highw_in":"名二環名古屋","highw_out":"引山"}'::jsonb,
     '2026-01-24T18:36:38.290Z'::timestamptz, NULL),

    -- 49: 73fdee91 田澤 highw 確定
    (v_cid, 'E-20251214-73FD', v_emp_tazawa, 'APPROVED', '2026-01-24T18:37:21.307Z'::timestamptz, '202512',
     '2025-12-14', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1vxa4_FgiS8t52aL4-bpNX3Verlh3ufZd/view?usp=drivesdk', true, '{"highw_in":"引山","highw_out":"東名名古屋"}'::jsonb,
     '2026-01-24T18:37:21.307Z'::timestamptz, NULL),

    -- 50: bffafe88 田澤 highw 確定
    (v_cid, 'E-20251214-BFFA', v_emp_tazawa, 'APPROVED', '2026-01-24T18:38:09.827Z'::timestamptz, '202512',
     '2025-12-14', 'highw', '高速', 1060, '名東',
     NULL, 'https://drive.google.com/file/d/1Qe1QWtGgSJaDKhUIVdHl22SXiyLD0839/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T18:38:09.827Z'::timestamptz, NULL),

    -- 51: 0e23529b 田澤 highw 確定
    (v_cid, 'E-20251217-0E23', v_emp_tazawa, 'APPROVED', '2026-01-24T21:43:00.825Z'::timestamptz, '202512',
     '2025-12-17', 'highw', '高速', 1900, '春日井',
     NULL, 'https://drive.google.com/file/d/1-FK01hF5n10r4-KLwelZFEUkOO9sfnQ3/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     '2026-01-24T21:43:00.825Z'::timestamptz, NULL),

    -- 52: a19ffac6 田澤 highw 確定
    (v_cid, 'E-20251217-A19F', v_emp_tazawa, 'APPROVED', '2026-01-24T21:43:44.790Z'::timestamptz, '202512',
     '2025-12-17', 'highw', '高速', 1900, '春日井',
     NULL, 'https://drive.google.com/file/d/1ox_Je5El2tKAXMNUCpY3QJPQ6vl2JOA3/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T21:43:44.790Z'::timestamptz, NULL),

    -- 53: d1ab7bcd 田澤 highw 確定
    (v_cid, 'E-20251218-D1AB', v_emp_tazawa, 'APPROVED', '2026-01-24T21:44:50.044Z'::timestamptz, '202512',
     '2025-12-18', 'highw', '高速', 1900, '春日井',
     NULL, 'https://drive.google.com/file/d/1WHGDCOZFNcmNuQp4Y796okW8GtDsx6TQ/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     '2026-01-24T21:44:50.044Z'::timestamptz, NULL),

    -- 54: ba4c9e77 田澤 highw 確定
    (v_cid, 'E-20260118-BA4C', v_emp_tazawa, 'APPROVED', '2026-01-24T21:45:40.947Z'::timestamptz, '202601',
     '2026-01-18', 'highw', '高速', 560, '春日井',
     NULL, 'https://drive.google.com/file/d/1gtDkLjcEpYB5_b8DJyulhKgfH4aaMd7P/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"名古屋"}'::jsonb,
     '2026-01-24T21:45:40.947Z'::timestamptz, NULL),

    -- 55: f8830e2a 田澤 highw 確定
    (v_cid, 'E-20251221-F883', v_emp_tazawa, 'APPROVED', '2026-01-24T21:46:34.247Z'::timestamptz, '202512',
     '2025-12-21', 'highw', '高速', 1060, '名東',
     NULL, 'https://drive.google.com/file/d/1-gP1XYtfVcSuz_1Q0qdUkwEGdITZco74/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"名二環名古屋"}'::jsonb,
     '2026-01-24T21:46:34.247Z'::timestamptz, NULL),

    -- 56: 6b1bf648 田澤 highw 確定
    (v_cid, 'E-20251221-6B1B', v_emp_tazawa, 'APPROVED', '2026-01-24T21:47:15.151Z'::timestamptz, '202512',
     '2025-12-21', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1FdMpH_4S5JuOU8sToc_2mLvja_2wNVQ2/view?usp=drivesdk', true, '{"highw_in":"名二環名古屋","highw_out":"引山"}'::jsonb,
     '2026-01-24T21:47:15.151Z'::timestamptz, NULL),

    -- 57: 5a3dd407 田澤 highw 確定
    (v_cid, 'E-20251221-5A3D', v_emp_tazawa, 'APPROVED', '2026-01-24T21:48:18.249Z'::timestamptz, '202512',
     '2025-12-21', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1ZSVLCOXwR7f9y3atLttEOSJVWibCVKzc/view?usp=drivesdk', true, '{"highw_in":"引山","highw_out":"東名名古屋"}'::jsonb,
     '2026-01-24T21:48:18.249Z'::timestamptz, NULL),

    -- 58: 7b361150 田澤 highw 確定
    (v_cid, 'E-20251221-7B36', v_emp_tazawa, 'APPROVED', '2026-01-24T21:49:13.829Z'::timestamptz, '202512',
     '2025-12-21', 'highw', '高速', 1060, '名東',
     NULL, 'https://drive.google.com/file/d/1VceYxe6tzpMNVQq1jHfDTRhJn0DK1R_E/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T21:49:13.829Z'::timestamptz, NULL),

    -- 59: 7a5877d8 田澤 highw 確定
    (v_cid, 'E-20251224-7A58', v_emp_tazawa, 'APPROVED', '2026-01-24T21:52:08.137Z'::timestamptz, '202512',
     '2025-12-24', 'highw', '高速', 1540, '春日井',
     NULL, 'https://drive.google.com/file/d/1aXKTn1HeUaBSj57OnQYPblzP_720xOLu/view?usp=drivesdk', true, '{"highw_in":"岡崎","highw_out":"春日井"}'::jsonb,
     '2026-01-24T21:52:08.137Z'::timestamptz, NULL),

    -- 60: 19bd4d4b 田澤 highw 確定
    (v_cid, 'E-20251224-19BD', v_emp_tazawa, 'APPROVED', '2026-01-24T21:53:04.480Z'::timestamptz, '202512',
     '2025-12-24', 'highw', '高速', 270, '名東',
     NULL, 'https://drive.google.com/file/d/1Jvgq3u3B_YR3oueZBAiRmyVuPxj9d0HB/view?usp=drivesdk', true, '{"highw_in":"引山","highw_out":"東名名古屋"}'::jsonb,
     '2026-01-24T21:53:04.480Z'::timestamptz, NULL),

    -- 61: 269db6ba 田澤 highw 確定
    (v_cid, 'E-20251224-269D', v_emp_tazawa, 'APPROVED', '2026-01-24T21:53:49.961Z'::timestamptz, '202512',
     '2025-12-24', 'highw', '高速', 1510, '名東',
     NULL, 'https://drive.google.com/file/d/1_4JylCK2Djoyno_GXybYdLP4NCzW7lzw/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"音羽蒲郡"}'::jsonb,
     '2026-01-24T21:53:49.961Z'::timestamptz, NULL),

    -- 62: d41f3bcd 田澤 enterm 確定
    (v_cid, 'E-20251231-D41F', v_emp_tazawa, 'APPROVED', '2026-01-24T22:12:18.918Z'::timestamptz, '202512',
     '2025-12-31', 'enterm', '接待交際費', 9900, 'かぐら',
     '忘年会(平松)', 'https://drive.google.com/uc?id=19Yb198COAYbc9x7Ql2S1c6gfG-0EMuTk&export=download', true, '{"details_text":"忘年会(平松)"}'::jsonb,
     '2026-01-24T22:12:18.918Z'::timestamptz, NULL),

    -- 63: c229dfcd 田澤 cons 確定
    (v_cid, 'E-20251215-C229', v_emp_tazawa, 'APPROVED', '2026-01-24T22:30:20.958Z'::timestamptz, '202512',
     '2025-12-15', 'cons', '消耗品', 3190, 'Amazon',
     '消臭剤(車用)', 'https://drive.google.com/file/d/1eSZI3MJwCwa10PTii70nacENs-UWGj96/view?usp=drivesdk', true, '{"details_text":"消臭剤(車用)"}'::jsonb,
     '2026-01-24T22:30:20.958Z'::timestamptz, NULL),

    -- 64: 25445c1b 田澤 cons 確定
    (v_cid, 'E-20251215-2544', v_emp_tazawa, 'APPROVED', '2026-01-24T22:31:00.168Z'::timestamptz, '202512',
     '2025-12-15', 'cons', '消耗品', 12328, 'Amazon',
     '絞り器', 'https://drive.google.com/file/d/1aCGl-DPx7fSASl2Ub8S0WVASZg3OKZ9H/view?usp=drivesdk', true, '{"details_text":"絞り器"}'::jsonb,
     '2026-01-24T22:31:00.168Z'::timestamptz, NULL),

    -- 65: 179a1dee 田澤 cons 確定
    (v_cid, 'E-20251215-179A', v_emp_tazawa, 'APPROVED', '2026-01-24T22:31:36.392Z'::timestamptz, '202512',
     '2025-12-15', 'cons', '消耗品', 2780, 'Amazon',
     '洗車モップ', 'https://drive.google.com/file/d/10hx6FFYJ0yHJDj9iA0rjX37H-3UO3p3v/view?usp=drivesdk', true, '{"details_text":"洗車モップ"}'::jsonb,
     '2026-01-24T22:31:36.392Z'::timestamptz, NULL),

    -- 66: d25b0aea 田澤 cons 確定
    (v_cid, 'E-20251215-D25B', v_emp_tazawa, 'APPROVED', '2026-01-24T22:32:22.634Z'::timestamptz, '202512',
     '2025-12-15', 'cons', '消耗品', 9920, 'Amazon',
     '洗車タオル4枚', 'https://drive.google.com/file/d/14UmgU0MnZCmEZpioCoB6zh6TR7ICDMu3/view?usp=drivesdk', true, '{"details_text":"洗車タオル4枚"}'::jsonb,
     '2026-01-24T22:32:22.634Z'::timestamptz, NULL),

    -- 67: 18536fc2 神谷 gas 確定
    (v_cid, 'E-20260125-1853', v_emp_kamiya, 'APPROVED', '2026-01-25T05:10:42.635Z'::timestamptz, '202601',
     '2026-01-25', 'gas', 'ガソリン', 5350, 'selfix',
     NULL, 'https://drive.google.com/file/d/1ESgSPyyALzOLVRvypJ7YihzIG3-Vai1X/view?usp=drivesdk', true, '{"gas_liters":"38.77"}'::jsonb,
     '2026-01-25T05:10:42.635Z'::timestamptz, NULL),

    -- 68: b24926fd 神谷 highw 確定
    (v_cid, 'E-20251215-B249', v_emp_kamiya, 'APPROVED', '2026-01-25T11:53:48.783Z'::timestamptz, '202512',
     '2025-12-15', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1iN5Ff5Rk6HsDKtVMXcJVxpdVLPxloW0_/view?usp=drivesdk', true, '{"highw_in":"名古屋南","highw_out":"一宮南"}'::jsonb,
     '2026-01-25T11:53:48.783Z'::timestamptz, NULL),

    -- 69: e1587161 神谷 highw 確定
    (v_cid, 'E-20251215-E158', v_emp_kamiya, 'APPROVED', '2026-01-25T11:53:48.880Z'::timestamptz, '202512',
     '2025-12-15', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1NGbLBH4jquz-h5BRoE--CegxYKW4zZ_k/view?usp=drivesdk', true, '{"highw_in":"一宮","highw_out":"大高"}'::jsonb,
     '2026-01-25T11:53:48.880Z'::timestamptz, NULL),

    -- 70: 8845339a 神谷 highw 確定
    (v_cid, 'E-20251210-8845', v_emp_kamiya, 'APPROVED', '2026-01-25T11:53:48.902Z'::timestamptz, '202512',
     '2025-12-10', 'highw', '高速', 3260, '東海北陸',
     NULL, 'https://drive.google.com/file/d/1x41dWDlgGZpk6QpRatvWPBk5nW-IoJYy/view?usp=drivesdk', true, '{"highw_in":"山県","highw_out":"豊田南"}'::jsonb,
     '2026-01-25T11:53:48.902Z'::timestamptz, NULL),

    -- 71: 8d160ef1 神谷 highw 確定
    (v_cid, 'E-20251217-8D16', v_emp_kamiya, 'APPROVED', '2026-01-25T11:53:48.840Z'::timestamptz, '202512',
     '2025-12-17', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1uqrdszpEdwSGj3i3o0Rk4JOrt6inPowP/view?usp=drivesdk', true, '{"highw_in":"一宮","highw_out":"大高"}'::jsonb,
     '2026-01-25T11:53:48.840Z'::timestamptz, NULL),

    -- 72: a470fc3c 神谷 highw 確定
    (v_cid, 'E-20251210-A470', v_emp_kamiya, 'APPROVED', '2026-01-25T11:53:48.842Z'::timestamptz, '202512',
     '2025-12-10', 'highw', '高速', 1440, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1Q-3TDlrmc7wINYVtbFfSx0QXuVhUEyEl/view?usp=drivesdk', true, '{"highw_in":"名古屋南","highw_out":"一宮南"}'::jsonb,
     '2026-01-25T11:53:48.842Z'::timestamptz, NULL),

    -- 73: b9a23dc7 神谷 highw 確定
    (v_cid, 'E-20251217-B9A2', v_emp_kamiya, 'APPROVED', '2026-01-25T11:53:48.928Z'::timestamptz, '202512',
     '2025-12-17', 'highw', '高速', 1970, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1yOWyTJnk6Vn3pJFL08h28rFKJj_i9oO5/view?usp=drivesdk', true, '{"highw_in":"名古屋南","highw_out":"各務原"}'::jsonb,
     '2026-01-25T11:53:48.928Z'::timestamptz, NULL),

    -- 74: 1d97f118 神谷 gas 未確定
    (v_cid, 'E-20260126-1D97', v_emp_kamiya, 'SUBMITTED', '2026-01-26T07:05:36.924Z'::timestamptz, '202601',
     '2026-01-26', 'gas', 'ガソリン', 1000, '出光',
     NULL, 'https://drive.google.com/file/d/1Afkh7nQPjJtKSIxfNovdAWkpyRJPjNpb/view?usp=drivesdk', true, '{"gas_liters":"6.99"}'::jsonb,
     NULL, NULL),

    -- 75: 28ec75bf 神谷 gas 未確定
    (v_cid, 'E-20260201-28EC', v_emp_kamiya, 'SUBMITTED', '2026-01-31T23:57:18.140Z'::timestamptz, '202602',
     '2026-02-01', 'gas', 'ガソリン', 5350, 'selfix',
     NULL, 'https://drive.google.com/uc?id=1S7-4M0mqSTTEBxWPypY_F9o1hR82U39F&export=download', true, '{"gas_liters":"38.77"}'::jsonb,
     NULL, NULL),

    -- 76: 42cef9d0 西部 highw 未確定
    (v_cid, 'E-20260201-42CE', v_emp_seibu, 'SUBMITTED', '2026-02-01T11:41:38.008Z'::timestamptz, '202602',
     '2026-02-01', 'highw', '高速', 100, '愛知道路コンセッション株式会社',
     NULL, 'https://drive.google.com/uc?id=1EkCgdwgMolaJItIs2gbq5uhFR2fSnWqg&export=download', true, '{"highw_in":"衣浦豊田道路","highw_out":"衣浦豊田道路"}'::jsonb,
     NULL, NULL),

    -- 77: fbf2e60b 西部 highw 未確定
    (v_cid, 'E-20260201-FBF2', v_emp_seibu, 'SUBMITTED', '2026-02-01T11:42:20.027Z'::timestamptz, '202602',
     '2026-02-01', 'highw', '高速', 100, '愛知道路コンセッション株式会社',
     NULL, 'https://drive.google.com/uc?id=1klOR2bY5h0RjAq-c9rwA34A8izHAypkF&export=download', true, '{"highw_in":"衣浦豊田道路","highw_out":"衣浦豊田道路"}'::jsonb,
     NULL, NULL),

    -- 78: 84087d04 西部 highw 未確定
    (v_cid, 'E-20260201-8408', v_emp_seibu, 'SUBMITTED', '2026-02-01T11:43:49.713Z'::timestamptz, '202602',
     '2026-02-01', 'highw', '高速', 1860, '中日本高速道路株式会社',
     NULL, 'https://drive.google.com/uc?id=14o9rP8X3dcwFMHxg1FfHB3XXpFUAdmKW&export=download', true, '{"highw_in":"富加関","highw_out":"豊田南第一"}'::jsonb,
     NULL, NULL),

    -- 79: b2b0d120 西部 highw 未確定
    (v_cid, 'E-20260201-B2B0', v_emp_seibu, 'SUBMITTED', '2026-02-01T11:44:37.654Z'::timestamptz, '202602',
     '2026-02-01', 'highw', '高速', 940, '中日本高速道路株式会社',
     NULL, 'https://drive.google.com/uc?id=1jpm8jL5ho2kPpv-eBwDMl_-MvDospsZ4&export=download', true, '{"highw_in":"豊田","highw_out":"小牧東"}'::jsonb,
     NULL, NULL),

    -- 80: 2f4ef1df 神谷 cons 未確定
    (v_cid, 'E-20260202-2F4E', v_emp_kamiya, 'SUBMITTED', '2026-02-02T11:24:13.484Z'::timestamptz, '202602',
     '2026-02-02', 'cons', '消耗品', 1089, 'アストロプロダクツ',
     'フォームガン', 'https://drive.google.com/uc?id=1cb9kGQcpQIs1YBawyirZSgN_xYkwfTP7&export=download', true, '{"details_text":"フォームガン"}'::jsonb,
     NULL, NULL),

    -- 81: 67114b88 神谷 cons 未確定
    (v_cid, 'E-20260202-6711', v_emp_kamiya, 'SUBMITTED', '2026-02-02T11:24:13.464Z'::timestamptz, '202602',
     '2026-02-02', 'cons', '消耗品', 20856, 'アストロプロダクツ',
     'ダブルアクション\nウールバフ\nハイトレール', 'https://drive.google.com/uc?id=1VQXrfXaxQ1gL8holzXuHc0yuX7es_hnT&export=download', true, '{"details_text":"ダブルアクション\nウールバフ\nハイトレール"}'::jsonb,
     NULL, NULL),

    -- 82: 5e5c0d79 神谷 gas 未確定
    (v_cid, 'E-20260203-5E5C', v_emp_kamiya, 'SUBMITTED', '2026-02-03T07:19:20.875Z'::timestamptz, '202602',
     '2026-02-03', 'gas', 'ガソリン', 4310, '丸栄石油',
     NULL, 'https://drive.google.com/uc?id=11Di96T-ERt8-aR0-bglJLaEVj76EO7kn&export=download', true, '{"gas_liters":"30.57"}'::jsonb,
     NULL, NULL),

    -- 83: 61e05031 西部 gas 未確定
    (v_cid, 'E-20260207-61E0', v_emp_seibu, 'SUBMITTED', '2026-02-08T03:54:55.663Z'::timestamptz, '202602',
     '2026-02-07', 'gas', 'ガソリン', 3000, 'アポロステーションセルフ春日井インター',
     NULL, 'https://drive.google.com/file/d/1ONnhva_cJq72bdE4yh2R2KQkRYrJajCq/view?usp=drivesdk', true, '{"gas_liters":"20.55"}'::jsonb,
     NULL, NULL),

    -- 84: 901d1086 西部 gas 未確定
    (v_cid, 'E-20260211-901D', v_emp_seibu, 'SUBMITTED', '2026-02-11T12:23:00.805Z'::timestamptz, '202602',
     '2026-02-11', 'gas', 'ガソリン', 3420, '大森石油株式会社　Dr.Drive春日井店',
     NULL, 'https://drive.google.com/uc?id=1sbWCuunEQHvH_05r7BVEOaCzdoQ6_A4G&export=download', true, '{"gas_liters":"23.75"}'::jsonb,
     NULL, NULL),

    -- 85: 03ff3031 神谷 gas 未確定
    (v_cid, 'E-20260209-03FF', v_emp_kamiya, 'SUBMITTED', '2026-02-12T15:17:22.019Z'::timestamptz, '202602',
     '2026-02-09', 'gas', 'ガソリン', 5250, 'Enejet',
     NULL, 'https://drive.google.com/uc?id=1xZyMtFONKZwB8bw-6wr_5t8LKXXAlfKV&export=download', true, '{"gas_liters":"36.46"}'::jsonb,
     NULL, NULL),

    -- 86: 9f2e940e 神谷 gas 未確定
    (v_cid, 'E-20260217-9F2E', v_emp_kamiya, 'SUBMITTED', '2026-02-19T13:42:53.712Z'::timestamptz, '202602',
     '2026-02-17', 'gas', 'ガソリン', 5350, '丸栄石油',
     NULL, 'https://drive.google.com/uc?id=1zrJz5EBTfvAjoxD_TEYUDpINkVoWAlk1&export=download', true, '{"gas_liters":"37.15"}'::jsonb,
     NULL, NULL),

    -- 87: b154caf1 平松 highw 未確定
    (v_cid, 'E-20260125-B154', v_emp_hiramatsu, 'SUBMITTED', '2026-02-20T13:11:22.456Z'::timestamptz, '202601',
     '2026-01-25', 'highw', '高速', 2660, 'NEXCO中日本',
     NULL, 'https://drive.google.com/file/d/1jrYrZHhGv8iap0m0YMcCa4UQxI6l7-7k/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡IC","highw_out":"引山IC"}'::jsonb,
     NULL, NULL),

    -- 88: db6a42c2 神谷 highw 未確定
    (v_cid, 'E-20251222-DB6A', v_emp_kamiya, 'SUBMITTED', '2026-02-21T01:52:54.367Z'::timestamptz, '202512',
     '2025-12-22', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1PVzvuIsWH3chYXYRNE3mVEhW1CoVCImv/view?usp=drivesdk', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 89: 21e663a4 神谷 highw 未確定
    (v_cid, 'E-20251222-21E6', v_emp_kamiya, 'SUBMITTED', '2026-02-21T01:53:55.547Z'::timestamptz, '202512',
     '2025-12-22', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1UKqvpSoWWGHlKHgiO79CeCDG3j9104KE/view?usp=drivesdk', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 90: b3c66ca3 神谷 highw 未確定
    (v_cid, 'E-20260106-B3C6', v_emp_kamiya, 'SUBMITTED', '2026-02-21T01:55:31.728Z'::timestamptz, '202601',
     '2026-01-06', 'highw', '高速', 3270, '東海北陸自動車道',
     NULL, 'https://drive.google.com/file/d/1jdiuPBWOUmWSFoHSjmdfS_YUG6DoCFZ2/view?usp=drivesdk', true, '{"highw_in":"山県","highw_out":"豊田南第一"}'::jsonb,
     NULL, NULL),

    -- 91: ab217cd0 神谷 highw 未確定
    (v_cid, 'E-20260106-AB21', v_emp_kamiya, 'SUBMITTED', '2026-02-21T01:56:24.133Z'::timestamptz, '202601',
     '2026-01-06', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1HQIBS7E1r0Lx7sDHuGpXNVL6W9n3OoAn/view?usp=drivesdk', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 92: 71eb4e5b 神谷 highw 未確定
    (v_cid, 'E-20260107-71EB', v_emp_kamiya, 'SUBMITTED', '2026-02-21T01:57:01.025Z'::timestamptz, '202601',
     '2026-01-07', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1IOVx50Ws7EHhAhB7E6hRXUaJhoCJtvtV/view?usp=drivesdk', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 93: 820fd6e5 神谷 highw 未確定
    (v_cid, 'E-20260107-820F', v_emp_kamiya, 'SUBMITTED', '2026-02-21T01:58:38.795Z'::timestamptz, '202601',
     '2026-01-07', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/14KiWKtjiEmpJNgS0zNQyZYCQbnWMspUL/view?usp=drivesdk', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 94: 3181555d 神谷 highw 未確定
    (v_cid, 'E-20260117-3181', v_emp_kamiya, 'SUBMITTED', '2026-02-21T01:59:26.185Z'::timestamptz, '202601',
     '2026-01-17', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1k9UAd0Ds-PrjgQ92lRuQP53GSP8-Mm0j/view?usp=drivesdk', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 95: 10a195da 神谷 highw 未確定
    (v_cid, 'E-20260114-10A1', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:00:00.604Z'::timestamptz, '202601',
     '2026-01-14', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1n05dWVx3v3K5NQPKtc_2lvJsoYWaiWe6/view?usp=drivesdk', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 96: edf88614 神谷 highw 未確定
    (v_cid, 'E-20260114-EDF8', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:00:34.413Z'::timestamptz, '202601',
     '2026-01-14', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1VdKiUwa6eIMJXtaFtkssn0l9npvnd-oW/view?usp=drivesdk', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 97: 1a09d997 神谷 highw 未確定
    (v_cid, 'E-20260128-1A09', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:01:08.316Z'::timestamptz, '202601',
     '2026-01-28', 'highw', '高速', 3280, '東海北陸自動車道',
     NULL, 'https://drive.google.com/file/d/15J-YimIEBJJG8GcyFcEL4H2yVL1d5603/view?usp=drivesdk', true, '{"highw_in":"高鷲","highw_out":"春日井"}'::jsonb,
     NULL, NULL),

    -- 98: 035a4ca4 神谷 highw 未確定
    (v_cid, 'E-20260117-035A', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:01:43.458Z'::timestamptz, '202601',
     '2026-01-17', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/file/d/1ugQM_wlElfbycf1hSlQ-NA4VYMIAy9ob/view?usp=drivesdk', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 99: 7f9b8ae9 神谷 highw 未確定
    (v_cid, 'E-20260211-7F9B', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:02:35.329Z'::timestamptz, '202602',
     '2026-02-11', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=1HlzXdPSKkW2b2YxK_atJgpwTFP_vLjFm&export=download', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 100: 044c4bac 神谷 highw 未確定
    (v_cid, 'E-20260201-044C', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:03:09.550Z'::timestamptz, '202602',
     '2026-02-01', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=19SIEFA8L8YGMSyIEL2X26zkLJ7nJcCl5&export=download', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 101: 80d53c07 神谷 highw 未確定
    (v_cid, 'E-20260201-80D5', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:03:39.978Z'::timestamptz, '202602',
     '2026-02-01', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=1268y1veF1P1-qrrelWr51YkHDATi2MGM&export=download', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 102: 489b5b58 神谷 highw 未確定
    (v_cid, 'E-20260206-489B', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:04:08.252Z'::timestamptz, '202602',
     '2026-02-06', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=1aJhDkvjM0Bz-4YoAEQoiSB-tq859cQgw&export=download', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 103: 38952b19 神谷 highw 未確定
    (v_cid, 'E-20260206-3895', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:04:44.068Z'::timestamptz, '202602',
     '2026-02-06', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=1OAWpQq_w6FMQ7SXmJjEDHqesCaQVNYr4&export=download', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL)
  ;

  -- ================================================================
  -- 追加の経費データ（31件）
  -- ================================================================
  INSERT INTO expenses (
    company_id, expense_id, emp_id, status, submitted_at, ym,
    expense_date, category_id, category_name, amount, vendor,
    description, receipt_url, receipt_synced, extra_fields,
    approved_at, approved_by
  ) VALUES
    -- 104: 3901e392 神谷 highw 未確定
    (v_cid, 'E-20260207-3901', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:10:37.792Z'::timestamptz, '202602',
     '2026-02-07', 'highw', '高速', 1290, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=1DxlvLnEc_tWeYD-utmVeAZnruGfvjlB_&export=download', true, '{"highw_in":"一宮中","highw_out":"名四連絡出口"}'::jsonb,
     NULL, NULL),

    -- 105: 5746f79c 神谷 highw 未確定
    (v_cid, 'E-20260207-5746', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:32:52.306Z'::timestamptz, '202602',
     '2026-02-07', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=15kPkf7ycSFYZrnRdXQ6OkBj9wSsfPpha&export=download', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 106: f8706baf 神谷 highw 未確定
    (v_cid, 'E-20260209-F870', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:33:33.181Z'::timestamptz, '202602',
     '2026-02-09', 'highw', '高速', 3270, '東海北陸自動車道',
     NULL, 'https://drive.google.com/uc?id=1FLqLj1YKN3my1YfhPSwnBrOJeIi6U4A3&export=download', true, '{"highw_in":"山県","highw_out":"豊田南第一"}'::jsonb,
     NULL, NULL),

    -- 107: 43335414 神谷 highw 未確定
    (v_cid, 'E-20260209-4333', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:34:04.194Z'::timestamptz, '202602',
     '2026-02-09', 'highw', '高速', 2650, '東海北陸自動車道',
     NULL, 'https://drive.google.com/uc?id=1OQYpbqHLnDwtbOwT0CUgEKiNUT_7oJYh&export=download', true, '{"highw_in":"豊田南第一","highw_out":"富加関"}'::jsonb,
     NULL, NULL),

    -- 108: 490965e0 神谷 highw 未確定
    (v_cid, 'E-20260211-4909', v_emp_kamiya, 'SUBMITTED', '2026-02-21T02:34:34.565Z'::timestamptz, '202602',
     '2026-02-11', 'highw', '高速', 1270, '名古屋高速',
     NULL, 'https://drive.google.com/uc?id=1_fedCLAdtK5DoVrFjCrmYHd09X2oZumR&export=download', true, '{"highw_in":"名四連絡至星崎","highw_out":"一宮東出口"}'::jsonb,
     NULL, NULL),

    -- 109: 5adf981b 田澤 cons 未確定
    (v_cid, 'E-20260122-5ADF', v_emp_tazawa, 'SUBMITTED', '2026-02-22T12:58:46.997Z'::timestamptz, '202601',
     '2026-01-22', 'cons', '消耗品', 1344, 'コーナン',
     'ホワイトウッド\nステンスクリュー釘\nコンパクトソー\n(絞り器の土台の為)', 'https://drive.google.com/file/d/1IgxJB2rYpIZopen25pCcyH6eMeeF-XF5/view?usp=drivesdk', true, '{"details_text":"ホワイトウッド\nステンスクリュー釘\nコンパクトソー\n(絞り器の土台の為)"}'::jsonb,
     NULL, NULL),

    -- 110: 296db909 田澤 highw 未確定
    (v_cid, 'E-20260117-296D', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:01:18.439Z'::timestamptz, '202601',
     '2026-01-17', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/18YCOHiHtnCuqRnZ2GXmvUZSCn--fyNr_/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 111: 95a25672 田澤 highw 未確定
    (v_cid, 'E-20260117-95A2', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:03:01.425Z'::timestamptz, '202601',
     '2026-01-17', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1tTGiXiYMzZsrolQBBYcpWBe5aRBlsRXn/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     NULL, NULL),

    -- 112: bb74dbeb 田澤 highw 未確定
    (v_cid, 'E-20260109-BB74', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:04:34.214Z'::timestamptz, '202601',
     '2026-01-09', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1_p1LCvhZV1eByIh588l0vPrS3QtwLNI0/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 113: eb8f2a0a 田澤 highw 未確定
    (v_cid, 'E-20260109-EB8F', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:05:35.527Z'::timestamptz, '202601',
     '2026-01-09', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1Llyqpd-RXkN926cKOAxYULsjoLjYJUSZ/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 114: 2a0a4f65 田澤 highw 未確定
    (v_cid, 'E-20260108-2A0A', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:06:44.788Z'::timestamptz, '202601',
     '2026-01-08', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1-YDEanZmbuAcMY3d733Wd_4RiQLgumSs/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     NULL, NULL),

    -- 115: fe2355f0 田澤 highw 未確定
    (v_cid, 'E-20260108-FE23', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:07:33.160Z'::timestamptz, '202601',
     '2026-01-08', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1L8YFe9EuLbAePtTe086Nh4Rq2L82ZpTI/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 116: 2d9aebc1 田澤 highw 未確定
    (v_cid, 'E-20260118-2D9A', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:09:16.618Z'::timestamptz, '202601',
     '2026-01-18', 'highw', '高速', 2440, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1DZ57kr3LUezu1damNdASYfOL_S6Vy03h/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"名二環名古屋"}'::jsonb,
     NULL, NULL),

    -- 117: 92d77a11 田澤 highw 未確定
    (v_cid, 'E-20260118-92D7', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:10:16.753Z'::timestamptz, '202601',
     '2026-01-18', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1w7rlBWm6YilCcpa0xbV3E6grB9TEmAuu/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 118: e503916d 田澤 highw 未確定
    (v_cid, 'E-20260122-E503', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:13:10.613Z'::timestamptz, '202601',
     '2026-01-22', 'highw', '高速', 1510, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1efoDR0kr45uYF0XKVK0VYyMZnaBEaSf3/view?usp=drivesdk', true, '{"highw_in":"名古屋","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 119: cc6423ef 田澤 highw 未確定
    (v_cid, 'E-20260122-CC64', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:14:55.925Z'::timestamptz, '202601',
     '2026-01-22', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1iyquf341gfoY9OvAnXXqxpNC_3-jNkQR/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     NULL, NULL),

    -- 120: a6bc104d 田澤 cons 未確定
    (v_cid, 'E-20260101-A6BC', v_emp_tazawa, 'SUBMITTED', '2026-02-22T13:17:26.572Z'::timestamptz, '202601',
     '2026-01-01', 'cons', '消耗品', 713, 'ドン・キホーテ',
     'アロンアルファ', 'https://drive.google.com/file/d/1-SgEqfoBKOigIHq96bzRLCQnA9zpDYei/view?usp=drivesdk', true, '{"details_text":"アロンアルファ"}'::jsonb,
     NULL, NULL),

    -- 121: 24579e13 田澤 highw 未確定
    (v_cid, 'E-20260115-2457', v_emp_tazawa, 'SUBMITTED', '2026-02-22T18:19:26.133Z'::timestamptz, '202601',
     '2026-01-15', 'highw', '高速', 3110, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/12uR-dMutUHvhPU0nXOSNqHqk_idoWOcB/view?usp=drivesdk', true, '{"highw_in":"大垣","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 122: eeee177a 田澤 highw 未確定
    (v_cid, 'E-20260110-EEEE', v_emp_tazawa, 'SUBMITTED', '2026-02-22T18:20:47.343Z'::timestamptz, '202601',
     '2026-01-10', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1uuSA6ZAcinlIoLba6729RVAKOX2AsKjv/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"春日井"}'::jsonb,
     NULL, NULL),

    -- 123: ecf3431c 田澤 highw 未確定
    (v_cid, 'E-20260110-ECF3', v_emp_tazawa, 'SUBMITTED', '2026-02-22T18:22:08.239Z'::timestamptz, '202601',
     '2026-01-10', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1v23SfQ7YfJw6oWbXPu9nUw14VklcHznY/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 124: ffc5fbf8 田澤 highw 未確定
    (v_cid, 'E-20260114-FFC5', v_emp_tazawa, 'SUBMITTED', '2026-02-22T18:23:35.910Z'::timestamptz, '202601',
     '2026-01-14', 'highw', '高速', 1900, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1DU97Hs5sfk4GZq3dgEhqJrvr5r03122g/view?usp=drivesdk', true, '{"highw_in":"春日井","highw_out":"音羽蒲郡"}'::jsonb,
     NULL, NULL),

    -- 125: 21527548 田澤 highw 未確定
    (v_cid, 'E-20260114-2152', v_emp_tazawa, 'SUBMITTED', '2026-02-22T18:24:16.368Z'::timestamptz, '202601',
     '2026-01-14', 'highw', '高速', 1380, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1EXZJZRkIiyrhJ0XVsf50tXgep0I0xW2i/view?usp=drivesdk', true, '{"highw_in":"大垣","highw_out":"春日井"}'::jsonb,
     NULL, NULL),

    -- 126: fd42cfd4 田澤 highw 未確定
    (v_cid, 'E-20260115-FD42', v_emp_tazawa, 'SUBMITTED', '2026-02-22T18:25:35.932Z'::timestamptz, '202601',
     '2026-01-15', 'highw', '高速', 3110, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1TxlfgqNQiEYPmZ2BMl5QBw6NItaGJhz3/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"大垣"}'::jsonb,
     NULL, NULL),

    -- 127: d19e9c17 田澤 highw 未確定
    (v_cid, 'E-20260114-D19E', v_emp_tazawa, 'SUBMITTED', '2026-02-22T18:26:36.071Z'::timestamptz, '202601',
     '2026-01-14', 'highw', '高速', 3110, 'NEXCO',
     NULL, 'https://drive.google.com/file/d/1mz9_ZmVsg0QYtjMdmrNEn6cm3ozf2gJB/view?usp=drivesdk', true, '{"highw_in":"音羽蒲郡","highw_out":"大垣"}'::jsonb,
     NULL, NULL),

    -- 128: a7f5ab95 神谷 gas 未確定
    (v_cid, 'E-20260223-A7F5', v_emp_kamiya, 'SUBMITTED', '2026-02-23T10:15:35.610Z'::timestamptz, '202602',
     '2026-02-23', 'gas', 'ガソリン', 5000, 'セルフィックス',
     NULL, 'https://drive.google.com/uc?id=1nJ1WdxzR15ZW-7nPvZWp6ywar1L5Cc8t&export=download', true, '{"gas_liters":"35.72"}'::jsonb,
     NULL, NULL),

    -- 129: ab92aebf 西部 gas 未確定
    (v_cid, 'E-20260223-AB92', v_emp_seibu, 'SUBMITTED', '2026-02-24T13:33:43.585Z'::timestamptz, '202602',
     '2026-02-23', 'gas', 'ガソリン', 4704, '(有)ケイエムエナジー　美濃加茂',
     NULL, 'https://drive.google.com/uc?id=1tUxSaltUFiyPKk67UGpnj5keYqAYC60J&export=download', true, '{"gas_liters":"32"}'::jsonb,
     NULL, NULL),

    -- 130: f820cb13 西部 gas 未確定
    (v_cid, 'E-20260307-F820', v_emp_seibu, 'SUBMITTED', '2026-03-07T14:21:41.393Z'::timestamptz, '202603',
     '2026-03-07', 'gas', 'ガソリン', 4590, '出光　EハウスR19SS  (株)中日本エネルギー',
     NULL, 'https://drive.google.com/uc?id=1i8Ms0piF1JgvLENqX9HUOYbbtg6KQzlQ&export=download', true, '{"gas_liters":"30.2"}'::jsonb,
     NULL, NULL),

    -- 131: 8014cf48 神谷 gas 未確定
    (v_cid, 'E-20260305-8014', v_emp_kamiya, 'SUBMITTED', '2026-03-09T08:43:29.796Z'::timestamptz, '202603',
     '2026-03-05', 'gas', 'ガソリン', 3087, 'コスモ石油',
     NULL, 'https://drive.google.com/uc?id=1Tuy5XyRiz9P77wrPSRIcxsnYov0Z33D3&export=download', true, '{"gas_liters":"21"}'::jsonb,
     NULL, NULL),

    -- 132: e03fa292 神谷 gas 未確定
    (v_cid, 'E-20260311-E03F', v_emp_kamiya, 'SUBMITTED', '2026-03-11T01:14:10.949Z'::timestamptz, '202603',
     '2026-03-11', 'gas', 'ガソリン', 6120, 'アポロステーション',
     NULL, 'https://drive.google.com/uc?id=1dgCdRO0O23YdjHyjwhOy0BeoALVyFOx6&export=download', true, '{"gas_liters":"38.25"}'::jsonb,
     NULL, NULL),

    -- 133: f97926b0 西部 gas 未確定
    (v_cid, 'E-20260311-F979', v_emp_seibu, 'SUBMITTED', '2026-03-11T12:35:11.225Z'::timestamptz, '202603',
     '2026-03-11', 'gas', 'ガソリン', 1430, '出光　EハウスR19SS  (株)中日本エネルギー',
     NULL, 'https://drive.google.com/uc?id=1QwBZvVilw9XaACo3TnbK2mKLOEsvnYuB&export=download', true, '{"gas_liters":"9.41"}'::jsonb,
     NULL, NULL),

    -- 134: 1338e5de 神谷 other 未確定
    (v_cid, 'E-20260314-1338', v_emp_kamiya, 'SUBMITTED', '2026-03-14T03:21:43.258Z'::timestamptz, '202603',
     '2026-03-14', 'other', 'その他', 15208, 'anthropic',
     'claude code', 'https://drive.google.com/uc?id=1vANWc1Q2xlY6oEnbt44fimzCpWcG5w1M&export=download', true, '{"details_text":"claude code"}'::jsonb,
     NULL, NULL)
  ;

  RAISE NOTICE '経費データ移行完了: 134件';
END $$;
