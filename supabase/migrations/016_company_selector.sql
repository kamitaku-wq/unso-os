-- =================================================================
-- 会社選択機能: get_my_company_id() をカスタムヘッダー対応に更新
-- x-company-id ヘッダーが設定されていれば、所属確認後にその会社を返す
-- =================================================================

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN current_setting('request.header.x-company-id', true) IS NOT NULL
      AND current_setting('request.header.x-company-id', true) != ''
      AND EXISTS (
        SELECT 1 FROM employees
        WHERE google_email = auth.jwt() ->> 'email'
          AND company_id = current_setting('request.header.x-company-id', true)::uuid
          AND is_active = true
      )
    THEN current_setting('request.header.x-company-id', true)::uuid
    ELSE (
      SELECT company_id FROM employees
      WHERE google_email = auth.jwt() ->> 'email'
        AND is_active = true
      LIMIT 1
    )
  END;
$$;
