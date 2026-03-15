-- RLS関数 get_my_company_id() が全テーブルアクセスで employees.google_email を参照するため、
-- このインデックスは全クエリのパフォーマンスに直結する
CREATE INDEX IF NOT EXISTS idx_employees_google_email_active
  ON employees (google_email, is_active);
