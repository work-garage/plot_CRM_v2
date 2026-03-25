// This file contains TypeScript interfaces matching the database schema.

export type Project = {
  id: string;
  name: string;
  location?: string;
  total_plots_count: number;
  min_plot_rate?: number;
  starting_plot_number?: number;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Plot = {
  id: string;
  project_id: string;
  plot_number: string;
  size_sqft: number;
  rate_per_sqft: number;
  total_amount: number;
  status?: 'available' | 'token' | 'agreement' | 'sold';
  facing?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type Advisor = {
  id: string;
  name: string;
  code: string;
  phone: string;
  address?: string;
  birth_date?: string;
  commission_token?: number;
  commission_agreement?: number;
  commission_registry?: number;
  commission_full_payment?: number;
  is_active?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  birth_date?: string;
  advisor_id?: string;
  route?: string;
  is_active?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type PlotSale = {
  id: string;
  plot_id: string;
  customer_id: string;
  advisor_id: string;
  sale_phase: 'token' | 'agreement' | 'registry' | 'full_payment';
  token_date?: string;
  agreement_date?: string;
  total_sale_amount: number;
  down_payment?: number;
  monthly_emi?: number;
  emi_day?: number;
  amount_paid?: number;
  remaining_amount?: number;
  is_cancelled?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type Payment = {
  id: string;
  sale_id: string;
  customer_id: string;
  slip_number?: string;
  receipt_path?: string;
  amount: number;
  payment_date: string;
  payment_mode: 'cash' | 'online' | 'cheque';
  is_confirmed?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdvisorCommission = {
  id: string;
  advisor_id: string;
  sale_id: string;
  commission_percentage: number;
  total_commission_amount: number;
  amount_paid?: number;
  remaining_commission?: number;
  paid_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdvisorCommissionPayment = {
  id: string;
  commission_id: string;
  amount: number;
  extra_paid_amount?: number;
  paid_date: string;
  payment_mode?: 'cash' | 'online' | 'cheque';
  reference_number?: string;
  receipt_path?: string;
  note?: string;
  created_at?: string;
};

export type OfficeExpense = {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category?: 'salary' | 'utilities' | 'maintenance' | 'marketing' | 'misc';
  receipt_note?: string;
  receipt_path?: string;
  created_at?: string;
  updated_at?: string;
};

export type Staff = {
  id: string;
  name: string;
  role?: string;
  daily_rate?: number;
  monthly_rate?: number;
  phone?: string;
  join_date?: string;
  is_active?: boolean;
  created_at?: string;
};

export type StaffAttendance = {
  id: string;
  staff_id: string;
  date: string;
  is_present?: boolean;
  half_day?: boolean;
  notes?: string;
  created_at?: string;
};

export type Reminder = {
  id: string;
  title: string;
  type:
    | 'token_expiry'
    | 'agreement_expiry'
    | 'installment_due'
    | 'birthday_customer'
    | 'birthday_advisor'
    | 'bank_statement'
    | 'balance_plot'
    | 'crm_followup'
    | 'calling'
    | 'other';
  phone?: string | null;
  description?: string | null;
  reminder_date: string;
  reminder_time?: string | null;
  customer_id?: string | null;
  is_completed?: boolean;
  created_at?: string;
  updated_at?: string;
};