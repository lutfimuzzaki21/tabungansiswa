-- Migration patch: Update loans table for teacher loans (non-affecting student balances)
-- Run this in Supabase SQL Editor
-- Safe version with no duplicate policy drops/creates

-- 1. Drop ALL old loan policies first
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policies WHERE schemaname='public' AND tablename='loans' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.loans', r.polname);
  END LOOP;
END $$;

-- Drop loan_repayments old policies
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policies WHERE schemaname='public' AND tablename='loan_repayments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.loan_repayments', r.polname);
  END LOOP;
END $$;

-- 2. Drop old functions
DROP FUNCTION IF EXISTS public.disburse_loan(UUID, NUMERIC, DATE, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.repay_loan(UUID, NUMERIC, TEXT, UUID, UUID);

-- 3. Drop old indexes/constraints referencing student_id/savings_account_id
DROP INDEX IF EXISTS public.idx_loans_student;
ALTER TABLE public.loans 
  DROP CONSTRAINT IF EXISTS loans_savings_account_id_fkey,
  DROP CONSTRAINT IF EXISTS loans_student_id_fkey;

-- 4. Alter loans table
ALTER TABLE public.loans
  DROP COLUMN IF EXISTS savings_account_id CASCADE,
  DROP COLUMN IF EXISTS student_id CASCADE;

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS borrowed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_loans_borrowed ON public.loans(borrowed_by);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);

-- 5. Create RPCs
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
AS $$
DECLARE
  v_loan RECORD;
  v_new_repaid NUMERIC;
  v_new_outstanding NUMERIC;
  v_new_status loan_status;
BEGIN
  SELECT l.id, l.principal_amount, l.amount_repaid, l.amount_outstanding, l.status, l.borrowed_by
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

-- 6. Create new policies
CREATE POLICY "loans_select_teacher" ON public.loans
  FOR SELECT USING (public.is_teacher_or_admin() OR borrowed_by = auth.uid());

CREATE POLICY "loans_write_teacher" ON public.loans
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "loan_repayments_select_teacher" ON public.loan_repayments
  FOR SELECT USING (
    public.is_teacher_or_admin() OR 
    EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND l.borrowed_by = auth.uid())
  );

CREATE POLICY "loan_repayments_write_teacher" ON public.loan_repayments
  FOR ALL USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- 7. Grants
GRANT EXECUTE ON FUNCTION public.disburse_teacher_loan TO authenticated;
GRANT EXECUTE ON FUNCTION public.repay_teacher_loan TO authenticated;
REVOKE EXECUTE ON FUNCTION public.disburse_loan FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.repay_loan FROM authenticated;
