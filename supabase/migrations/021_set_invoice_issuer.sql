-- FUNCTION カーリペア社の請求書発行者情報を設定
UPDATE companies
SET custom_settings = jsonb_set(
  COALESCE(custom_settings, '{}'),
  '{invoice_issuer}',
  '{
    "issuer_name": "FUNCTION",
    "issuer_address": "〒501-3824 岐阜県関市東新町7丁目13－1",
    "issuer_tel": "090-3256-1331",
    "tax_id": "T8810005419988",
    "bank_info": "ソニー銀行　本店営業部支店　普通 6372221　ｸﾜﾊﾗ ｲｻﾐﾁ"
  }'::jsonb
)
WHERE custom_settings->>'app_name' = 'FUNCTION カーリペア';
