-- 清掃業務用テーブル（cleaning_jobs + works）

-- 作業種別マスタ
CREATE TABLE IF NOT EXISTS works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  work_code text NOT NULL,
  name text NOT NULL,
  default_unit_price numeric,
  is_active boolean DEFAULT true,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (company_id, work_code)
);

-- 清掃作業実績
CREATE TABLE IF NOT EXISTS cleaning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  job_id text NOT NULL UNIQUE,
  work_date date NOT NULL,
  ym text NOT NULL,
  store_id text,
  store_name text,
  work_code text,
  work_name text,
  car_type_text text,
  id_list_raw text,
  qty integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  price_note text,
  emp_id text NOT NULL,
  status text NOT NULL DEFAULT 'REVIEW_REQUIRED',
  approved_at timestamptz,
  approved_by text,
  void_at timestamptz,
  void_by text,
  invoice_id text,
  invoiced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_company ON cleaning_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_ym ON cleaning_jobs(company_id, ym);
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_store ON cleaning_jobs(company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_emp ON cleaning_jobs(company_id, emp_id);
CREATE INDEX IF NOT EXISTS idx_works_company ON works(company_id);

-- RLS 有効化
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_jobs ENABLE ROW LEVEL SECURITY;

-- works: 同じ会社の社員は全員閲覧可、変更は ADMIN/OWNER のみ
CREATE POLICY works_select ON works FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY works_insert ON works FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY works_update ON works FOR UPDATE
  USING (company_id = get_my_company_id());

CREATE POLICY works_delete ON works FOR DELETE
  USING (company_id = get_my_company_id());

-- cleaning_jobs: 同じ会社の社員は全員閲覧可
CREATE POLICY cleaning_jobs_select ON cleaning_jobs FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY cleaning_jobs_insert ON cleaning_jobs FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY cleaning_jobs_update ON cleaning_jobs FOR UPDATE
  USING (company_id = get_my_company_id());

CREATE POLICY cleaning_jobs_delete ON cleaning_jobs FOR DELETE
  USING (company_id = get_my_company_id());
