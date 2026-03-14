-- 経費レシートの Google Drive 転送ステータス管理カラムを追加
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_synced boolean DEFAULT false;
