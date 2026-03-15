-- cleaning_jobs に請求書期間カラムを追加
ALTER TABLE cleaning_jobs ADD COLUMN IF NOT EXISTS invoice_period_from date;
ALTER TABLE cleaning_jobs ADD COLUMN IF NOT EXISTS invoice_period_to date;

-- 請求書検索用インデックス
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_invoice
  ON cleaning_jobs(company_id, store_id, status, invoice_id);
