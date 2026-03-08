-- =================================================================
-- 給与計算モジュール
-- salary_settings: 社員ごとの給与設定
-- payrolls: 月次給与計算結果台帳
-- =================================================================

-- 給与設定テーブル（社員ごとの基本給・計算方式）
CREATE TABLE salary_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  emp_id              text NOT NULL,
  pay_type            text NOT NULL CHECK (pay_type IN ('MONTHLY', 'HOURLY')),
  basic_monthly       integer,            -- 月給（MONTHLY の場合）
  hourly_wage         integer,            -- 時給（HOURLY の場合）
  overtime_rate       numeric NOT NULL DEFAULT 1.25,  -- 残業割増率
  transport_allowance integer NOT NULL DEFAULT 0,     -- 交通費（月額固定）
  standard_work_hours numeric NOT NULL DEFAULT 160,   -- 月の所定労働時間（残業単価計算用）
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, emp_id)
);

ALTER TABLE salary_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON salary_settings
  USING (company_id = get_my_company_id());

-- 給与台帳テーブル（月次計算結果）
CREATE TABLE payrolls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  emp_id                text NOT NULL,
  ym                    text NOT NULL,   -- 対象年月 YYYYMM
  basic_pay             integer NOT NULL DEFAULT 0,   -- 基本給
  overtime_pay          integer NOT NULL DEFAULT 0,   -- 残業代
  transport_allowance   integer NOT NULL DEFAULT 0,   -- 交通費
  expense_reimbursement integer NOT NULL DEFAULT 0,   -- 経費精算額（立替経費）
  gross_pay             integer NOT NULL DEFAULT 0,   -- 支給総額
  work_hours            numeric NOT NULL DEFAULT 0,   -- 勤務時間（h）
  overtime_hours        numeric NOT NULL DEFAULT 0,   -- 残業時間（h）
  status                text NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT', 'CONFIRMED', 'PAID')),
  note                  text,
  confirmed_at          timestamptz,
  paid_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, emp_id, ym)
);

ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON payrolls
  USING (company_id = get_my_company_id());
