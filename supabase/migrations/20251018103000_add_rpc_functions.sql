-- RPC: generate transaction number
CREATE OR REPLACE FUNCTION public.generate_txn_number()
RETURNS TEXT
LANGUAGE plpgsql
AS 
DECLARE
  v_num TEXT;
  v_date TEXT;
  v_seq INT;
BEGIN
  v_date := to_char(NOW(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 12) AS INT)), 0) + 1
    INTO v_seq
    FROM public.savings_transactions
    WHERE transaction_number LIKE 'TXN-' || v_date || '%';
  v_num := 'TXN-' || v_date || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_num;
END;
;

-- RPC: record deposit (atomic)
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
AS 
DECLARE
  v_account_id UUID;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_txn_id UUID;
  v_txn_num TEXT;
  v_acc RECORD;
BEGIN
  -- Get account
  SELECT sa.id, sa.balance INTO STRICT v_acc
    FROM public.savings_accounts sa
    WHERE sa.student_id = p_student_id;
  v_account_id := v_acc.id;
  v_balance_before := v_acc.balance;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be > 0';
  END IF;

  v_balance_after := v_balance_before + p_amount;
  v_txn_num := public.generate_txn_number();

  -- Insert transaction
  INSERT INTO public.savings_transactions (
    transaction_number, savings_account_id, student_id, type, amount,
    balance_before, balance_after, status, proof_url, proof_path, notes,
    recorded_by, idempotency_key
  ) VALUES (
    v_txn_num, v_account_id, p_student_id, 'deposit', p_amount,
    v_balance_before, v_balance_after, 'completed', p_proof_url, p_proof_path, p_notes,
    p_recorded_by, p_idempotency_key
  ) RETURNING id INTO v_txn_id;

  -- Update account
  UPDATE public.savings_accounts
    SET balance = v_balance_after,
        total_deposits = total_deposits + p_amount,
        updated_at = NOW()
    WHERE id = v_account_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_txn_id, 'balance_after', v_balance_after);
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
;
