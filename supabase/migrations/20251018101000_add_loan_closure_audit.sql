-- Loans
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_account_id UUID NOT NULL REFERENCES public.savings_accounts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  principal_amount NUMERIC(15,2) NOT NULL CHECK (principal_amount > 0),
  amount_repaid NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_repaid >= 0),
  amount_outstanding NUMERIC(15,2) NOT NULL CHECK (amount_outstanding >= 0),
  status loan_status NOT NULL DEFAULT 'active',
  due_date DATE,
  notes TEXT,
  disbursement_transaction_id UUID REFERENCES public.savings_transactions(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loans_outstanding_consistent CHECK (amount_outstanding = principal_amount - amount_repaid),
  CONSTRAINT loans_repaid_not_exceed CHECK (amount_repaid <= principal_amount)
);

-- Loan repayments
CREATE TABLE IF NOT EXISTS public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  repayment_transaction_id UUID REFERENCES public.savings_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Closure periods
CREATE TABLE IF NOT EXISTS public.closure_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  academic_year TEXT,
  semester TEXT,
  closed_at TIMESTAMPTZ,
  status period_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT closure_periods_name_check CHECK (char_length(trim(name)) >= 2)
);

-- Savings closures
CREATE TABLE IF NOT EXISTS public.savings_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_period_id UUID NOT NULL REFERENCES public.closure_periods(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  savings_account_id UUID NOT NULL REFERENCES public.savings_accounts(id) ON DELETE CASCADE,
  total_deposits NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(15,2) NOT NULL DEFAULT 0,
  loans_outstanding NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_snapshot NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance_snapshot >= 0),
  final_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
  status closure_status NOT NULL DEFAULT 'draft',
  signed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  signature_image_url TEXT,
  document_url TEXT,
  document_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT savings_closures_unique_per_period UNIQUE (closure_period_id, student_id)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
