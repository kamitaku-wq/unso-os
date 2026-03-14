-- =================================================================
-- DRIVER → WORKER ロール名変更
-- 全業種共通で「ワーカー」に統一する
-- =================================================================

-- 1. CHECK 制約を先に削除（WORKER 値への UPDATE を許可するため）
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE emp_requests DROP CONSTRAINT IF EXISTS emp_requests_role_requested_check;

-- 2. 既存の DRIVER 値を WORKER に更新
UPDATE employees SET role = 'WORKER' WHERE role = 'DRIVER';
UPDATE emp_requests SET role_requested = 'WORKER' WHERE role_requested = 'DRIVER';

-- 3. 新しい CHECK 制約を追加（WORKER / ADMIN / OWNER）
ALTER TABLE employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('WORKER', 'ADMIN', 'OWNER'));
ALTER TABLE emp_requests ADD CONSTRAINT emp_requests_role_requested_check
  CHECK (role_requested IN ('WORKER', 'ADMIN', 'OWNER'));
