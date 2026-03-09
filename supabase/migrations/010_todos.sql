-- Todo機能のテーブル定義
-- todos: 個人・割り当て共通の本体（削除は物理削除）
CREATE TABLE todos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  todo_id     text NOT NULL,        -- T-YYYYMMDD-XXXX
  creator_id  uuid NOT NULL REFERENCES employees(id),
  type        text NOT NULL CHECK (type IN ('personal', 'assigned')),
  title       text NOT NULL,
  due_date    date,                 -- 任意
  created_at  timestamptz DEFAULT now()
);

-- todo_assignments: 割り当て先ごとのステータス（todos削除でCASCADE削除）
CREATE TABLE todo_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id      uuid NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL,
  assignee_id  uuid NOT NULL REFERENCES employees(id),
  confirmed_at timestamptz,         -- 確認済みにした日時（NULLなら未確認）
  completed_at timestamptz,         -- 対応済みにした日時（NULLなら未対応）
  created_at   timestamptz DEFAULT now()
);

-- push_subscriptions: Web Push購読情報
CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  emp_id     uuid NOT NULL REFERENCES employees(id),
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(emp_id, endpoint)
);

-- RLS: todos
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos_company_isolation" ON todos
  USING (company_id = get_my_company_id());

-- RLS: todo_assignments
ALTER TABLE todo_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todo_assignments_company_isolation" ON todo_assignments
  USING (company_id = get_my_company_id());

-- RLS: push_subscriptions
-- SELECT: 同じ会社の社員全員が読める（サーバーから他社員への通知送信に必要）
-- INSERT/UPDATE/DELETE: 自分のレコードのみ
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_company_read" ON push_subscriptions
  FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "push_subscriptions_own_write" ON push_subscriptions
  FOR ALL USING (
    emp_id IN (
      SELECT id FROM employees WHERE google_email = (auth.jwt()->>'email')
    )
  );
