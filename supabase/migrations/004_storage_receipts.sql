-- =================================================================
-- レシート画像用 Supabase Storage バケット設定
-- =================================================================

-- receipts バケットを作成（非公開）
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 自分がアップロードしたファイルのみ参照・更新・削除可
CREATE POLICY "receipts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.jwt() ->> 'email' IN (
      SELECT google_email FROM employees WHERE is_active = true
    )
  );

CREATE POLICY "receipts_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.jwt() ->> 'email' IN (
      SELECT google_email FROM employees WHERE is_active = true
    )
  );

CREATE POLICY "receipts_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (
      SELECT emp_id FROM employees
      WHERE google_email = auth.jwt() ->> 'email' AND is_active = true
      LIMIT 1
    )
  );
