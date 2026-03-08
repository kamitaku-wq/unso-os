-- シフト管理テーブル
CREATE TABLE shifts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  emp_id      text NOT NULL,
  shift_date  date NOT NULL,
  is_day_off  boolean NOT NULL DEFAULT false,
  location    text,
  work_type   text,
  note        text,
  created_by  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(company_id, emp_id, shift_date)
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- 閲覧：同じ会社の全員
CREATE POLICY "company_read" ON shifts FOR SELECT
  USING (company_id = get_my_company_id());

-- 書き込み：ADMIN/OWNER のみ
CREATE POLICY "admin_write" ON shifts FOR ALL
  USING (
    company_id = get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE google_email = auth.jwt() ->> 'email'
        AND role IN ('ADMIN', 'OWNER')
        AND is_active = true
    )
  );
