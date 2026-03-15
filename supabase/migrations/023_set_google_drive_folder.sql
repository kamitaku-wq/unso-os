-- FUNCTION カーリペアの Google Drive フォルダ ID を設定
UPDATE companies SET custom_settings = jsonb_set(
  COALESCE(custom_settings, '{}'), '{google_drive_folder_id}',
  '"1bWHkMummkF3PQ-WP7Fxxma1HhsASMKQu"'::jsonb
) WHERE custom_settings->>'app_name' = 'FUNCTION カーリペア';
