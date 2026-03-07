-- =================================================================
-- emp_requests に未登録ユーザーの INSERT を許可するポリシーを追加
-- 理由: 未登録ユーザーは get_my_company_id() が NULL を返すため
--       既存の company_isolation ポリシーでは INSERT できない
-- =================================================================

CREATE POLICY "allow_self_insert" ON emp_requests
  FOR INSERT
  WITH CHECK (google_email = auth.jwt() ->> 'email');
