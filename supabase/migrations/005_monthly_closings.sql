-- =================================================================
-- 月次締めテーブル
-- 締め済みの年月への新規入力をブロックするために使用
-- =================================================================

CREATE TABLE monthly_closings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  ym         text NOT NULL,
  closed_at  timestamptz DEFAULT now(),
  closed_by  text NOT NULL,
  note       text,
  UNIQUE(company_id, ym)
);

ALTER TABLE monthly_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON monthly_closings
  USING (company_id = get_my_company_id());
