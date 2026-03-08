-- ============================================================
-- デモデータ投入スクリプト：運賃・シフト
-- Supabase SQL Editor で実行してください
-- 既存のルート・社員データをもとに自動生成します
-- ============================================================

-- ① 運賃マスタ（ratecards）
-- 既存ルートに運賃が未設定のものを一括登録する
-- base_fare は仮値（15,000円）。実態に合わせて後から変更可

INSERT INTO ratecards (company_id, route_id, cust_id, base_fare)
SELECT
  r.company_id,
  r.route_id,
  r.cust_id,
  15000 AS base_fare
FROM routes r
WHERE NOT EXISTS (
  SELECT 1 FROM ratecards rc
  WHERE rc.company_id = r.company_id
    AND rc.route_id   = r.route_id
)
ON CONFLICT DO NOTHING;

-- 登録結果を確認
SELECT r.route_id, r.cust_id, rc.base_fare
FROM routes r
LEFT JOIN ratecards rc ON rc.company_id = r.company_id AND rc.route_id = r.route_id
ORDER BY r.route_id;


-- ② シフト（shifts）
-- 今週月曜〜来々週日曜（3週間分）を全アクティブ社員に一括生成する
-- is_day_off=false・location は '本社' をデフォルトとし、土日のみ休日とする

DO $$
DECLARE
  rec         RECORD;
  shift_date  DATE;
  week_start  DATE;
  day_of_week INT;
BEGIN
  -- 今週月曜日を算出
  week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;

  FOR rec IN
    SELECT emp_id, company_id
    FROM employees
    WHERE is_active = true
  LOOP
    FOR i IN 0..20 LOOP   -- 3週間（21日）分
      shift_date  := week_start + i;
      day_of_week := EXTRACT(DOW FROM shift_date);  -- 0=日, 6=土

      INSERT INTO shifts (
        company_id, emp_id, shift_date,
        is_day_off, location, work_type, note, created_by
      )
      VALUES (
        rec.company_id,
        rec.emp_id,
        shift_date,
        CASE WHEN day_of_week IN (0, 6) THEN true ELSE false END,
        CASE WHEN day_of_week IN (0, 6) THEN NULL ELSE '本社' END,
        CASE WHEN day_of_week IN (0, 6) THEN NULL ELSE '配送' END,
        NULL,
        'demo_seed'
      )
      ON CONFLICT (company_id, emp_id, shift_date) DO NOTHING;

    END LOOP;
  END LOOP;
END $$;

-- 登録結果を確認
SELECT emp_id, shift_date, is_day_off, location, work_type
FROM shifts
ORDER BY emp_id, shift_date
LIMIT 30;
