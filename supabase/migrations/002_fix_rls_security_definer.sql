-- =================================================================
-- get_my_company_id に SECURITY DEFINER を追加
-- 理由: employees に RLS が設定されているため、関数内で employees を
--       参照すると無限再帰が発生する。SECURITY DEFINER で RLS をスキップ。
-- =================================================================

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM employees
  WHERE google_email = auth.jwt() ->> 'email'
    AND is_active = true
  LIMIT 1;
$$;
