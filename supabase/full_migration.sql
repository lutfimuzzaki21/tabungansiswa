-- =====================================================================
-- TABUNGAN SISWA - Full Database Migration
-- Jalankan SELURUH isi file ini di Supabase Dashboard > SQL Editor
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. TYPES
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'final_payout', 'adjustment', 'reversal');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
    CREATE TYPE loan_status AS ENUM ('active', 'paid', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_status') THEN
    CREATE TYPE period_status AS ENUM ('draft', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'closure_status') THEN
    CREATE TYPE closure_status AS ENUM ('draft', 'signed', 'cancelled');
  END IF;
END$$;

-- =====================================================================
-- 2. TABLES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_full_name_check CHECK (char_length(trim(full_name)) >= 2)
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teachers_employee_id_unique UNIQUE (employee_id)
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level TEXT,
  academic_year TEXT,
  class_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT classes_name_check CHECK (char_length(trim(name)) >= 1)
);

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nis TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT students_nis_unique UNIQUE (nis),
  CONSTRAINT students_full_name_check CHECK (char_length(trim(full_name)) >= 2)
);

CREATE TABLE IF NOT EXISTS public.student_class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unenrolled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposits NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_deposits >= 0),
  total_withdrawals NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_withdrawals >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT savings_accounts_student_unique UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL,
  savings_account_id UUID NOT NULL REFERENCES public.savings_accounts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(15,2) NOT NULL CHECK (balance_before >= 0),
  balance_after NUMERIC(15,2) NOT NULL CHECK (balance_after >= 0),
  status transaction_status NOT NULL DEFAULT 'completed',
  reference_id UUID,
  idempotency_key UUID UNIQUE,
  proof_url TEXT,
  proof_path TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT savings_transactions_txn_number_unique UNIQUE (transaction_number)
);

CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  principal_amount NUMERIC(15,2) NOT NULL CHECK (principal_amount > 0),
  amount_repaid NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_repaid >= 0),
  amount_outstanding NUMERIC(15,2) NOT NULL CHECK (amount_outstanding >= 0),
  status loan_status NOT NULL DEFAULT 'active',
  due_date DATE,
  description TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loans_repaid_not_exceed CHECK (amount_repaid <= principal_amount)
);

CREATE TABLE IF NOT EXISTS public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.savings_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_period_id UUID NOT NULL REFERENCES public.closure_periods(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  savings_account_id UUID REFERENCES public.savings_accounts(id) ON DELETE SET NULL,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_nis ON public.students(nis);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_student ON public.savings_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_savings_txn_student ON public.savings_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_savings_txn_account ON public.savings_transactions(savings_account_id);
CREATE INDEX IF NOT EXISTS idx_savings_txn_created ON public.savings_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_savings_txn_type ON public.savings_transactions(type);
CREATE INDEX IF NOT EXISTS idx_loans_borrowed ON public.loans(borrowed_by);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan ON public.loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- =====================================================================
-- 3. TRIGGER: auto-create profile & savings account
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create savings account when student is created
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.savings_accounts (student_id)
  VALUES (NEW.id)
  ON CONFLICT (student_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created
  AFTER INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_student();

-- =====================================================================
-- 4. RPC FUNCTIONS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.generate_txn_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_num TEXT;
  v_date TEXT;
  v_seq INT;
BEGIN
  v_date := to_char(NOW(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 14) AS INT)), 0) + 1
    INTO v_seq
    FROM public.savings_transactions
    WHERE transaction_number LIKE 'TXN-' || v_date || '%';
  v_num := 'TXN-' || v_date || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_num;
END;
$$;

-- Record deposit (atomic)
CREATE OR REPLACE FUNCTION public.record_deposit(
  p_student_id UUID,
  p_amount NUMERIC,
  p_proof_url TEXT DEFAULT NULL,
  p_proof_path TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc RECORD;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_txn_id UUID;
  v_txn_num TEXT;
BEGIN
  SELECT sa.id, sa.balance INTO STRICT v_acc
    FROM public.savings_accounts sa
    WHERE sa.student_id = p_student_id FOR UPDATE;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal harus lebih besar dari nol';
  END IF;

  v_balance_before := v_acc.balance;
  v_balance_after := v_balance_before + p_amount;
  v_txn_num := public.generate_txn_number();

  INSERT INTO public.savings_transactions (
    transaction_number, savings_account_id, student_id, type, amount,
    balance_before, balance_after, status, proof_url, proof_path, notes,
    recorded_by, idempotency_key
  ) VALUES (
    v_txn_num, v_acc.id, p_student_id, 'deposit', p_amount,
    v_balance_before, v_balance_after, 'completed', p_proof_url, p_proof_path, p_notes,
    COALESCE(p_recorded_by, auth.uid()), p_idempotency_key
  ) RETURNING id INTO v_txn_id;

  UPDATE public.savings_accounts
    SET balance = v_balance_after,
        total_deposits = total_deposits + p_amount,
        updated_at = NOW()
    WHERE id = v_acc.id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_txn_id, 'balance_after', v_balance_after, 'transaction_number', v_txn_num);
END;
$$;

-- Record withdrawal (atomic, with balance check)
CREATE OR REPLACE FUNCTION public.record_withdrawal(
  p_student_id UUID,
  p_amount NUMERIC,
  p_proof_url TEXT DEFAULT NULL,
  p_proof_path TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc RECORD;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_txn_id UUID;
  v_txn_num TEXT;
BEGIN
  SELECT sa.id, sa.balance INTO STRICT v_acc
    FROM public.savings_accounts sa
    WHERE sa.student_id = p_student_id FOR UPDATE;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal harus lebih besar dari nol';
  END IF;

  IF v_acc.balance < p_amount THEN
    RAISE EXCEPTION 'Saldo tidak mencukupi untuk penarikan';
  END IF;

  v_balance_before := v_acc.balance;
  v_balance_after := v_balance_before - p_amount;
  v_txn_num := public.generate_txn_number();

  INSERT INTO public.savings_transactions (
    transaction_number, savings_account_id, student_id, type, amount,
    balance_before, balance_after, status, proof_url, proof_path, notes,
    recorded_by, idempotency_key
  ) VALUES (
    v_txn_num, v_acc.id, p_student_id, 'withdrawal', p_amount,
    v_balance_before, v_balance_after, 'completed', p_proof_url, p_proof_path, p_notes,
    COALESCE(p_recorded_by, auth.uid()), p_idempotency_key
  ) RETURNING id INTO v_txn_id;

  UPDATE public.savings_accounts
    SET balance = v_balance_after,
        total_withdrawals = total_withdrawals + p_amount,
        updated_at = NOW()
    WHERE id = v_acc.id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_txn_id, 'balance_after', v_balance_after, 'transaction_number', v_txn_num);
END;
$$;

-- Record teacher loans without changing any student's savings balance.
CREATE OR REPLACE FUNCTION public.disburse_teacher_loan(
  p_borrowed_by UUID,
  p_amount NUMERIC,
  p_due_date DATE DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal harus lebih besar dari nol';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_borrowed_by) THEN
    RAISE EXCEPTION 'Profil peminjam tidak ditemukan';
  END IF;

  INSERT INTO public.loans (
    borrowed_by, principal_amount, amount_repaid, amount_outstanding,
    status, due_date, description, notes, recorded_by
  ) VALUES (
    p_borrowed_by, p_amount, 0, p_amount,
    'active', p_due_date, p_description, p_notes, COALESCE(auth.uid(), p_borrowed_by)
  ) RETURNING id INTO v_loan_id;

  RETURN jsonb_build_object('success', true, 'loan_id', v_loan_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.repay_teacher_loan(
  p_loan_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
  v_new_repaid NUMERIC;
  v_new_outstanding NUMERIC;
  v_new_status loan_status;
BEGIN
  SELECT l.id, l.amount_repaid, l.amount_outstanding, l.status
    INTO STRICT v_loan
    FROM public.loans l
    WHERE l.id = p_loan_id AND l.status = 'active'
    FOR UPDATE OF l;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal harus lebih besar dari nol';
  END IF;

  IF p_amount > v_loan.amount_outstanding THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa pinjaman';
  END IF;

  v_new_repaid := v_loan.amount_repaid + p_amount;
  v_new_outstanding := v_loan.amount_outstanding - p_amount;
  v_new_status := CASE WHEN v_new_outstanding <= 0 THEN 'paid' ELSE 'active' END;

  UPDATE public.loans
    SET amount_repaid = v_new_repaid,
        amount_outstanding = v_new_outstanding,
        status = v_new_status,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_loan_id;

  INSERT INTO public.loan_repayments (loan_id, amount, notes, recorded_by)
  VALUES (p_loan_id, p_amount, p_notes, auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'loan_id', p_loan_id,
    'amount_outstanding', v_new_outstanding,
    'status', v_new_status
  );
END;
$$;

-- =====================================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closure_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is teacher/admin
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own_or_teacher" ON public.profiles;
CREATE POLICY "profiles_select_own_or_teacher" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_teacher_or_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.is_teacher_or_admin());

-- Classes
DROP POLICY IF EXISTS "classes_select_all_authenticated" ON public.classes;
CREATE POLICY "classes_select_all_authenticated" ON public.classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "classes_write_teacher" ON public.classes;
CREATE POLICY "classes_write_teacher" ON public.classes
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Students
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students
  FOR SELECT USING (
    public.is_teacher_or_admin() OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "students_write_teacher" ON public.students;
CREATE POLICY "students_write_teacher" ON public.students
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Enrollments
DROP POLICY IF EXISTS "enrollments_select" ON public.student_class_enrollments;
CREATE POLICY "enrollments_select" ON public.student_class_enrollments
  FOR SELECT USING (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "enrollments_write_teacher" ON public.student_class_enrollments;
CREATE POLICY "enrollments_write_teacher" ON public.student_class_enrollments
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Savings accounts
DROP POLICY IF EXISTS "savings_accounts_select" ON public.savings_accounts;
CREATE POLICY "savings_accounts_select" ON public.savings_accounts
  FOR SELECT USING (
    public.is_teacher_or_admin() OR student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "savings_accounts_write_teacher" ON public.savings_accounts;
CREATE POLICY "savings_accounts_write_teacher" ON public.savings_accounts
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Savings transactions
DROP POLICY IF EXISTS "savings_transactions_select" ON public.savings_transactions;
CREATE POLICY "savings_transactions_select" ON public.savings_transactions
  FOR SELECT USING (
    public.is_teacher_or_admin() OR student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "savings_transactions_write_teacher" ON public.savings_transactions;
CREATE POLICY "savings_transactions_write_teacher" ON public.savings_transactions
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Loans
DROP POLICY IF EXISTS "loans_select" ON public.loans;
CREATE POLICY "loans_select" ON public.loans
  FOR SELECT USING (
    public.is_teacher_or_admin() OR borrowed_by = auth.uid()
  );

DROP POLICY IF EXISTS "loans_write_teacher" ON public.loans;
CREATE POLICY "loans_write_teacher" ON public.loans
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Loan repayments
DROP POLICY IF EXISTS "loan_repayments_select" ON public.loan_repayments;
CREATE POLICY "loan_repayments_select" ON public.loan_repayments
  FOR SELECT USING (
    public.is_teacher_or_admin() OR EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = loan_repayments.loan_id
        AND loans.borrowed_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "loan_repayments_write_teacher" ON public.loan_repayments;
CREATE POLICY "loan_repayments_write_teacher" ON public.loan_repayments
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Closure periods
DROP POLICY IF EXISTS "closure_periods_select" ON public.closure_periods;
CREATE POLICY "closure_periods_select" ON public.closure_periods
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "closure_periods_write_teacher" ON public.closure_periods;
CREATE POLICY "closure_periods_write_teacher" ON public.closure_periods
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Savings closures
DROP POLICY IF EXISTS "savings_closures_select" ON public.savings_closures;
CREATE POLICY "savings_closures_select" ON public.savings_closures
  FOR SELECT USING (
    public.is_teacher_or_admin() OR student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "savings_closures_write_teacher" ON public.savings_closures;
CREATE POLICY "savings_closures_write_teacher" ON public.savings_closures
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Audit logs
DROP POLICY IF EXISTS "audit_logs_select_teacher" ON public.audit_logs;
CREATE POLICY "audit_logs_select_teacher" ON public.audit_logs
  FOR SELECT USING (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "audit_logs_insert_any" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_any" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================================
-- 6. STORAGE: bucket bukti transaksi
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to proofs bucket
DROP POLICY IF EXISTS "proofs_insert_authenticated" ON storage.objects;
CREATE POLICY "proofs_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proofs');

-- Allow public read (untuk preview gambar)
DROP POLICY IF EXISTS "proofs_select_public" ON storage.objects;
CREATE POLICY "proofs_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'proofs');

-- =====================================================================
-- 7. GRANT execute pada RPC functions
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.record_deposit(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_withdrawal(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disburse_teacher_loan(UUID, NUMERIC, DATE, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repay_teacher_loan(UUID, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_txn_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin() TO authenticated;
