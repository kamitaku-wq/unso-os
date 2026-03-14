-- 作業種別マスタに表示順カラムを追加
ALTER TABLE works ADD COLUMN sort_order integer DEFAULT 0;

-- 既存データに seed SQL の登録順を反映
UPDATE works SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at, id) AS rn
  FROM works
) sub
WHERE works.id = sub.id;
