-- RPC: disburse loan (reduces balance available conceptually via transaction; loan recorded separately)
CREATE OR REPLACE FUNCTION public.disburse_loan(
  p_student_id UUID,
  p_amount NUMERIC,
  p_due_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS 
DECLARE
  v_acc RECORD;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_txn_id UUID;
  v_txn_num TEXT;
  v_loan_id UUID;
BEGIN
  SELECT sa.id, sa.balance INTO STRICT v_acc
    FROM public.savings_accounts sa
    WHERE sa.student_id = p_student_id;
  v_balance_before := v_acc.balance;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be > 0';
  END IF;

  IF v_balance_before < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance for loan disbursement';
  END IF;

  v_balance_after := v_balance_before - p_amount;
  v_txn_num := public.generate_txn_number();

  INSERT INTO public.savings_transactions (
    transaction_number, savings_account_id, student_id, type, amount,
    balance_before, balance_after, status, notes, recorded_by, idempotency_key
  ) VALUES (
    v_txn_num, v_acc.id, p_student_id, 'loan_disbursement', p_amount,
    v_balance_before, v_balance_after, 'completed', p_notes, p_recorded_by, p_idempotency_key
  ) RETURNING id INTO v_txn_id;

  UPDATE public.savings_accounts
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = v_acc.id;

  INSERT INTO public.loans (
    savings_account_id, student_id, principal_amount, amount_repaid, amount_outstanding,
    status, due_date, notes, disbursement_transaction_id, recorded_by
  ) VALUES (
    v_acc.id, p_student_id, p_amount, 0, p_amount,
    'active', p_due_date, p_notes, v_txn_id, p_recorded_by
  ) RETURNING id INTO v_loan_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_txn_id, 'loan_id', v_loan_id, 'balance_after', v_balance_after);
END;
;
