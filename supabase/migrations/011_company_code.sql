-- =================================================================
-- companies テーブルに company_code（参加コード）を追加
-- 社員登録申請時に UUID の代わりに使える短いコード（8文字英数字）
-- =================================================================

ALTER TABLE companies ADD COLUMN company_code TEXT UNIQUE;

-- 既存の会社に参加コードを付与（大文字英数字8文字）
UPDATE companies
SET company_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE company_code IS NULL;

-- NULL 禁止を追加
ALTER TABLE companies ALTER COLUMN company_code SET NOT NULL;
