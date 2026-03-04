-- =================================================================
-- 運送OS 初期スキーマ
-- マルチテナント対応：全テーブルに company_id を持ち RLS で分離
-- =================================================================

-- ------------------------------------------------------------------
-- 会社（テナント）
-- ------------------------------------------------------------------
CREATE TABLE companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  plan       text DEFAULT 'standard',
  created_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------------
-- 社員マスタ
-- ------------------------------------------------------------------
CREATE TABLE employees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id),
  emp_id       text NOT NULL,
  name         text NOT NULL,
  google_email text NOT NULL,
  role         text NOT NULL CHECK (role IN ('DRIVER', 'ADMIN', 'OWNER')),
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(company_id, emp_id)
);

-- ------------------------------------------------------------------
-- 社員申請（新規登録リクエスト）
-- ------------------------------------------------------------------
CREATE TABLE emp_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id),
  request_id     text NOT NULL,
  google_email   text NOT NULL,
  name           text NOT NULL,
  role_requested text NOT NULL CHECK (role_requested IN ('DRIVER', 'ADMIN', 'OWNER')),
  status         text NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  submitted_at   timestamptz DEFAULT now(),
  decided_at     timestamptz,
  decided_by     text,
  note           text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(company_id, request_id)
);

-- ------------------------------------------------------------------
-- 荷主マスタ
-- ------------------------------------------------------------------
CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  cust_id    text NOT NULL,
  name       text NOT NULL,
  address    text,
  UNIQUE(company_id, cust_id)
);

-- ------------------------------------------------------------------
-- ルートマスタ
-- ------------------------------------------------------------------
CREATE TABLE routes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id),
  route_id       text NOT NULL,
  cust_id        text NOT NULL,
  pickup_default text,
  drop_default   text,
  UNIQUE(company_id, route_id)
);

-- ------------------------------------------------------------------
-- 運賃マスタ
-- ------------------------------------------------------------------
CREATE TABLE ratecards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  route_id   text NOT NULL,
  cust_id    text NOT NULL,
  base_fare  numeric NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------------
-- 車両マスタ
-- ------------------------------------------------------------------
CREATE TABLE vehicles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id),
  vehicle_id   text NOT NULL,
  name         text NOT NULL,
  plate_no     text,
  vehicle_type text,
  capacity_ton numeric,
  is_active    boolean DEFAULT true,
  memo         text,
  UNIQUE(company_id, vehicle_id)
);

-- ------------------------------------------------------------------
-- 実績（請求対象）
-- ------------------------------------------------------------------
CREATE TABLE billables (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id),
  billable_id         text NOT NULL,
  request_id          text,
  timestamp           timestamptz DEFAULT now(),
  emp_id              text NOT NULL,
  cust_id             text,
  route_id            text,
  amount              numeric DEFAULT 0,
  status              text NOT NULL CHECK (status IN ('REVIEW_REQUIRED', 'APPROVED', 'VOID')),
  run_date            date,
  finish_at           timestamptz,
  pickup_loc          text,
  drop_loc            text,
  note                text,
  approved_at         timestamptz,
  approved_by         text,
  void_at             timestamptz,
  void_by             text,
  invoice_id          text,
  invoiced_at         timestamptz,
  invoice_period_from date,
  invoice_period_to   date,
  vehicle_id          text,
  depart_at           timestamptz,
  arrive_at           timestamptz,
  distance_km         numeric,
  UNIQUE(company_id, billable_id)
);

-- ------------------------------------------------------------------
-- 経費区分マスタ
-- ------------------------------------------------------------------
CREATE TABLE expense_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  category_id text NOT NULL,
  name        text NOT NULL,
  is_active   boolean DEFAULT true,
  note        text,
  UNIQUE(company_id, category_id)
);

-- ------------------------------------------------------------------
-- 経費申請
-- ------------------------------------------------------------------
CREATE TABLE expenses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid NOT NULL REFERENCES companies(id),
  expense_id         text NOT NULL,
  request_id         text,
  submitted_at       timestamptz,
  emp_id             text NOT NULL,
  expense_date       date,
  ym                 text,
  category_id        text,
  category_name      text,
  amount             numeric DEFAULT 0,
  vendor             text,
  description        text,
  receipt_url        text,
  status             text NOT NULL CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'REWORK_REQUIRED')),
  approved_at        timestamptz,
  approved_by        text,
  rejected_at        timestamptz,
  rejected_by        text,
  reject_reason      text,
  rework_at          timestamptz,
  rework_reason      text,
  paid_at            timestamptz,
  UNIQUE(company_id, expense_id)
);

-- ------------------------------------------------------------------
-- 勤怠
-- ------------------------------------------------------------------
CREATE TABLE attendances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  attendance_id text NOT NULL,
  emp_id        text NOT NULL,
  work_date     date NOT NULL,
  ym            text,
  clock_in      timestamptz,
  clock_out     timestamptz,
  break_min     integer DEFAULT 60,
  work_min      integer,
  drive_min     integer,
  overtime_min  integer,
  status        text NOT NULL CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
  approved_at   timestamptz,
  approved_by   text,
  reject_reason text,
  note          text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(company_id, attendance_id)
);

-- =================================================================
-- Row Level Security (RLS) — テナント間データ分離
-- ユーザーの company_id を employees テーブルの google_email から引く
-- =================================================================

ALTER TABLE companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE emp_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratecards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances       ENABLE ROW LEVEL SECURITY;

-- ログインユーザーの company_id を返すヘルパー関数
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT company_id
  FROM employees
  WHERE google_email = auth.jwt() ->> 'email'
    AND is_active = true
  LIMIT 1;
$$;

-- 各テーブルの RLS ポリシー（同じ company_id のみアクセス可）
CREATE POLICY "company_isolation" ON employees
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON emp_requests
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON customers
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON routes
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON ratecards
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON vehicles
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON billables
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON expense_categories
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON expenses
  USING (company_id = get_my_company_id());

CREATE POLICY "company_isolation" ON attendances
  USING (company_id = get_my_company_id());

-- companies テーブルは自社のみ参照可
CREATE POLICY "own_company_only" ON companies
  USING (id = get_my_company_id());
