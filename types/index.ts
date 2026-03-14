// アプリ全体で使う共有型定義

export type Role = 'WORKER' | 'ADMIN' | 'OWNER'

export type BillableStatus = 'REVIEW_REQUIRED' | 'APPROVED' | 'VOID'
export type ExpenseStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'REWORK_REQUIRED'
export type AttendanceStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED'
export type EmpRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type Employee = {
  id: string
  emp_id: string
  company_id: string
  name: string
  google_email: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Billable = {
  id: string
  billable_id: string
  company_id: string
  emp_id: string
  run_date: string | null
  cust_id: string | null
  route_id: string | null
  pickup_loc: string | null
  drop_loc: string | null
  depart_at: string | null
  arrive_at: string | null
  vehicle_id: string | null
  distance_km: number | null
  amount: number | null
  status: BillableStatus
  invoice_id: string | null
  invoiced_at: string | null
  invoice_period_from: string | null
  invoice_period_to: string | null
  note: string | null
  approved_at: string | null
  approved_by: string | null
  void_at: string | null
  void_by: string | null
  timestamp: string | null
}

export type Expense = {
  id: string
  expense_id: string
  company_id: string
  emp_id: string
  expense_date: string | null
  ym: string | null
  category_id: string | null
  category_name: string | null
  amount: number
  vendor: string | null
  description: string | null
  receipt_url: string | null
  status: ExpenseStatus
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  reject_reason: string | null
  rework_at: string | null
  rework_reason: string | null
  paid_at: string | null
}

export type Attendance = {
  id: string
  attendance_id: string
  company_id: string
  emp_id: string
  work_date: string
  ym: string | null
  clock_in: string | null
  clock_out: string | null
  break_min: number
  work_min: number | null
  drive_min: number | null
  overtime_min: number | null
  status: AttendanceStatus
  approved_at: string | null
  approved_by: string | null
  reject_reason: string | null
  note: string | null
  created_at: string
}

export type Customer = {
  id: string
  company_id: string
  cust_id: string
  name: string
  address: string | null
}

export type Route = {
  id: string
  company_id: string
  route_id: string
  cust_id: string
  pickup_default: string | null
  drop_default: string | null
}

export type Vehicle = {
  id: string
  company_id: string
  vehicle_id: string
  name: string
  plate_no: string | null
  vehicle_type: string | null
  capacity_ton: number | null
  is_active: boolean
  memo: string | null
}

export type ExpenseCategory = {
  id: string
  company_id: string
  category_id: string
  name: string
  is_active: boolean
  note: string | null
}

export type EmpRequest = {
  id: string
  company_id: string
  request_id: string
  google_email: string
  name: string
  role_requested: Role
  status: EmpRequestStatus
  submitted_at: string | null
  decided_at: string | null
  decided_by: string | null
  note: string | null
}
