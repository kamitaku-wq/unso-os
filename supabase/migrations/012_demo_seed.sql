-- =================================================================
-- デモ会社用初期データ投入
-- is_demo = true の会社に荷主・ルート・運賃・車両のサンプルを挿入する
-- 注意: このスクリプトはデモ会社が存在する場合にのみ有効
-- =================================================================

DO $$
DECLARE
  v_company_id uuid;
BEGIN
  -- デモ会社を取得（存在しない場合はスキップ）
  SELECT id INTO v_company_id FROM companies WHERE is_demo = true LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'デモ会社が見つかりません。スキップします。';
    RETURN;
  END IF;

  -- ── 荷主マスタ ─────────────────────────────
  INSERT INTO customers (company_id, cust_id, name, address) VALUES
    (v_company_id, 'C001', '田中商事株式会社', '東京都千代田区丸の内1-1-1'),
    (v_company_id, 'C002', '山田物産有限会社', '大阪府大阪市北区梅田2-2-2'),
    (v_company_id, 'C003', '佐藤フーズ株式会社', '神奈川県横浜市西区みなとみらい3-3-3')
  ON CONFLICT DO NOTHING;

  -- ── ルートマスタ ────────────────────────────
  INSERT INTO routes (company_id, route_id, name, origin, destination) VALUES
    (v_company_id, 'R001', '東京→横浜', '東京都千代田区', '神奈川県横浜市'),
    (v_company_id, 'R002', '東京→大阪', '東京都江東区', '大阪府大阪市'),
    (v_company_id, 'R003', '横浜→千葉', '神奈川県横浜市', '千葉県千葉市')
  ON CONFLICT DO NOTHING;

  -- ── 運賃マスタ ─────────────────────────────
  INSERT INTO ratecards (company_id, route_id, unit_price)
  SELECT v_company_id, r.id, price
  FROM (VALUES
    ('R001', 15000),
    ('R002', 45000),
    ('R003', 12000)
  ) AS t(route_id, price)
  JOIN routes r ON r.company_id = v_company_id AND r.route_id = t.route_id
  ON CONFLICT (company_id, route_id) DO NOTHING;

  -- ── 車両マスタ ─────────────────────────────
  INSERT INTO vehicles (company_id, vehicle_id, plate, type, capacity_kg) VALUES
    (v_company_id, 'V001', '品川 501 あ 1234', '4tトラック', 4000),
    (v_company_id, 'V002', '品川 502 い 5678', '2tトラック', 2000),
    (v_company_id, 'V003', '品川 503 う 9012', '10tトラック', 10000)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'デモデータの投入が完了しました（company_id: %）', v_company_id;
END;
$$;
