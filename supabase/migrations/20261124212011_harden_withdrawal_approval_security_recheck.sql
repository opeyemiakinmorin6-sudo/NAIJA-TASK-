CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal_safe(p_withdrawal_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id uuid;
  w public.withdrawals%rowtype;
  v_fee numeric;
  v_vip boolean;
  v_settings jsonb;
  v_balance numeric;
  v_security_enabled boolean;
  v_security record;
  v_trust_score integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND active = true
  ) THEN
    RAISE EXCEPTION 'Active administrator access required';
  END IF;

  -- Take the same per-user advisory lock used by withdrawal requests
  -- before locking the withdrawal and wallet rows.
  SELECT user_id INTO v_user_id
  FROM public.withdrawals
  WHERE id = p_withdrawal_id;

  IF NOT FOUND OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  SELECT * INTO w
  FROM public.withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF w.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Withdrawal ownership changed; refresh and review again';
  END IF;

  IF lower(coalesce(w.status,'')) <> 'pending' THEN
    RAISE EXCEPTION 'Withdrawal is no longer pending';
  END IF;

  IF coalesce(w.amount,0) <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount';
  END IF;

  SELECT balance, coalesce(is_vip,false)
  INTO v_balance, v_vip
  FROM public.profiles
  WHERE id = w.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT to_jsonb(ps) INTO v_settings
  FROM public.platform_settings ps
  ORDER BY ps.updated_at DESC NULLS LAST
  LIMIT 1;

  v_security_enabled := coalesce((v_settings->>'withdrawal_security_check')::boolean, true);

  -- A security hold pauses approval; it never confiscates wallet funds.
  IF v_security_enabled THEN
    SELECT us.is_banned, us.is_suspended, us.suspended_until,
           us.is_restricted, us.restricted_until
    INTO v_security
    FROM public.user_security_status us
    WHERE us.user_id = w.user_id;

    IF FOUND AND (
      coalesce(v_security.is_banned,false)
      OR (coalesce(v_security.is_suspended,false)
          AND (v_security.suspended_until IS NULL OR v_security.suspended_until > now()))
      OR (coalesce(v_security.is_restricted,false)
          AND (v_security.restricted_until IS NULL OR v_security.restricted_until > now()))
    ) THEN
      RAISE EXCEPTION 'Approval paused: this account has an active security restriction. Review the Security Centre and any appeal before approving.';
    END IF;

    SELECT uts.score INTO v_trust_score
    FROM public.user_trust_scores uts
    WHERE uts.user_id = w.user_id;

    IF coalesce(v_trust_score,70) < 30 THEN
      RAISE EXCEPTION 'Approval paused: user trust score is below 30. Review the security record and any appeal.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.task_verification_jobs j
      JOIN public.task_submissions s ON s.id = j.submission_id
      WHERE s.user_id = w.user_id
        AND j.status IN ('queued','processing','inconclusive','manual_review')
    ) THEN
      RAISE EXCEPTION 'Approval paused: a task verification re-check is still pending.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.user_strike_ledger sl
      WHERE sl.user_id = w.user_id
        AND sl.decision_status = 'confirmed'
        AND sl.created_at >= now() - interval '7 days'
    ) THEN
      RAISE EXCEPTION 'Approval paused: a confirmed task integrity strike is within the seven-day review period.';
    END IF;
  END IF;

  IF coalesce(v_balance,0) < w.amount THEN
    RAISE EXCEPTION 'User wallet balance is too low for this withdrawal';
  END IF;

  v_fee := coalesce(
    CASE WHEN v_vip
      THEN (v_settings->>'vip_withdrawal_fee')::numeric
      ELSE (v_settings->>'free_withdrawal_fee')::numeric
    END,
    100
  );

  IF v_fee < 0 OR v_fee >= w.amount THEN
    RAISE EXCEPTION 'Fee % is not valid for amount %', v_fee, w.amount;
  END IF;

  UPDATE public.profiles
  SET balance = coalesce(balance,0) - w.amount
  WHERE id = w.user_id;

  INSERT INTO public.wallet_transactions
    (user_id,type,amount,description,reference,status,created_at)
  VALUES
    (w.user_id,'WITHDRAWAL',-abs(w.amount),
     'Withdrawal approved (fee '||v_fee||' included, payout '||(w.amount-v_fee)||')',
     w.id::text,'APPROVED',now());

  UPDATE public.withdrawals
  SET status='approved',
      fee_amount=v_fee,
      payout_amount=w.amount-v_fee,
      reviewed_by=auth.uid(),
      reviewed_at=now()
  WHERE id=w.id;

  RETURN jsonb_build_object(
    'success',true,
    'withdrawal_id',w.id,
    'amount',w.amount,
    'fee',v_fee,
    'payout',w.amount-v_fee,
    'status','approved'
  );
END;
$function$;
