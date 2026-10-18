-- RPC: repay loan
CREATE OR REPLACE FUNCTION public.repay_loan(
  p_loan_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS 
DECLARE
  v_loan RECORD;
  v_acc RECORD;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_txn_id UUID;
  v_txn_num TEXT;
  v_repay_amount NUMERIC;
BEGIN
  SELECT l.*, sa.balance, sa.id AS acc_id
    INTO STRICT v_loan
    FROM public.loans l
    JOIN public.savings_accounts sa ON sa.id = l.savings_account_id
    WHERE l.id = p_loan_id
      AND l.status = 'active';

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be > 0';
  END IF;

  IF p_amount > v_loan.amount_outstanding THEN
    RAISE EXCEPTION 'Repayment exceeds outstanding amount';
  END IF;

  v_acc := (SELECT ROW(sa.id, sa.balance)::public.savings_accounts FROM public.savings_accounts sa WHERE sa.id = v_loan.savings_account_id);
  v_balance_before := v_loan.balance;
  -- get current balance
  SELECT balance INTO v_balance_before FROM public.savings_accounts WHERE id = v_loan.savings_account_id;
  v_balance_after := v_balance_before + p_amount;
  v_txn_num := public.generate_txn_number();

  INSERT INTO public.savings_transactions (
    transaction_number, savings_account_id, student_id, type, amount,
    balance_before, balance_after, status, notes, recorded_by, idempotency_key
  ) VALUES (
    v_txn_num, v_loan.savings_account_id, v_loan.student_id, 'loan_repayment', p_amount,
    v_balance_before, v_balance_after, 'completed', p_notes, p_recorded_by, p_idempotency_key
  ) RETURNING id INTO v_txn_id;

  UPDATE public.savings_accounts
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = v_loan.savings_account_id;

  UPDATE public.loans
    SET amount_repaid = amount_repaid + p_amount,
        amount_outstanding = amount_outstanding - p_amount,
        status = CASE WHEN (amount_outstanding - p_amount) <= 0 THEN 'paid' ELSE 'active' END,
        updated_at = NOW()
    WHERE id = p_loan_id;

  INSERT INTO public.loan_repayments (loan_id, amount, repayment_transaction_id, notes, recorded_by)
  VALUES (p_loan_id, p_amount, v_txn_id, p_notes, p_recorded_by);

  RETURN jsonb_build_object('success', true, 'transaction_id', v_txn_id, 'balance_after', v_balance_after);
END;
;
