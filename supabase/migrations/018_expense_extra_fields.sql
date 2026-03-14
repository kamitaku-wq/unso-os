-- 経費の区分別拡張フィールドを保存するカラムを追加
-- ガソリン: {"gas_liters": 35.5}
-- 高速: {"highw_in": "岐阜各務原IC", "highw_out": "一宮IC"}
-- 消耗品/日帰交通費/その他: {"details_text": "..."}
ALTER TABLE expenses ADD COLUMN extra_fields jsonb DEFAULT '{}';
