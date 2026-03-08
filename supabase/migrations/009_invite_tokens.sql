-- 招待トークンテーブル
-- 管理者が発行したリンクで従業員が参加申請できる
CREATE TABLE invite_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by  text NOT NULL,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- ADMIN/OWNER のみ閲覧・管理可
CREATE POLICY "admin_manage" ON invite_tokens FOR ALL
  USING (
    company_id = get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE google_email = auth.jwt() ->> 'email'
        AND role IN ('ADMIN', 'OWNER')
        AND is_active = true
    )
  );
