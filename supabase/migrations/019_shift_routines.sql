-- シフトルーティン（曜日別テンプレート）テーブル
CREATE TABLE shift_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  emp_id text NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=月 1=火 ... 6=日
  is_day_off boolean NOT NULL DEFAULT false,
  location text,
  work_type text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, emp_id, day_of_week)
);

-- RLS
ALTER TABLE shift_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_routines_select" ON shift_routines
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "shift_routines_insert" ON shift_routines
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "shift_routines_update" ON shift_routines
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "shift_routines_delete" ON shift_routines
  FOR DELETE USING (company_id = get_my_company_id());
