-- Migration 1: Initial schema for Tabungan Siswa
-- Created: 2026-10-18

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum
DO 
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
END;

-- Profiles (linked to auth.users)
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

-- Teachers
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teachers_employee_id_unique UNIQUE (employee_id)
);

-- Classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level TEXT,
  academic_year TEXT,
  class_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT classes_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT classes_name_unique UNIQUE (name, academic_year)
);

-- Students
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

-- Student class enrollments (history)
CREATE TABLE IF NOT EXISTS public.student_class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unenrolled_at TIMESTAMPTZ
);

-- Savings accounts
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

-- Savings transactions (ledger)
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
  idempotency_key UUID,
  proof_url TEXT,
  proof_path TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT savings_transactions_txn_number_unique UNIQUE (transaction_number),
  CONSTRAINT savings_transactions_idem_key_unique UNIQUE (idempotency_key),
  CONSTRAINT savings_txn_balance_consistent CHECK (balance_after = balance_before + (
    CASE 
      WHEN type IN ('deposit','loan_repayment','final_payout','adjustment') AND status='completed' THEN amount
      WHEN type IN ('withdrawal','loan_disbursement','reversal') AND status='completed' THEN -amount
      ELSE 0
    END
  ))
);
