-- パフォーマンス向上のための複合インデックス追加
-- ダッシュボード集計・一覧取得で頻用されるカラムの組み合わせ

-- 運行実績: ステータス別・日付範囲の絞り込みを高速化
CREATE INDEX IF NOT EXISTS idx_billables_status_run_date ON billables (company_id, status, run_date);

-- 清掃作業実績: 月別・ステータス別の集計を高速化
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_ym_status ON cleaning_jobs (company_id, ym, status);
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_status_work_date ON cleaning_jobs (company_id, status, work_date);

-- 経費: 月別・ステータス別の集計を高速化
CREATE INDEX IF NOT EXISTS idx_expenses_ym_status ON expenses (company_id, ym, status);

-- 勤怠: 月別・ステータス別の集計を高速化
CREATE INDEX IF NOT EXISTS idx_attendances_status_work_date ON attendances (company_id, status, work_date);

-- 請求書紐付け: 未請求実績の検索を高速化
CREATE INDEX IF NOT EXISTS idx_billables_invoice_null ON billables (company_id, status) WHERE invoice_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_invoice_null ON cleaning_jobs (company_id, status) WHERE invoice_id IS NULL;
