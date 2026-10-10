-- NAIJA TASK security + withdrawal migration
-- Run this in the Supabase SQL editor.

CREATE UNIQUE INDEX IF NOT EXISTS task_submissions_active_user_task_unique
ON public.task_submissions (task_id, user_id)
WHERE status IN ('PENDING', 'APPROVED', 'COMPLETED', 'SUCCESS');

CREATE OR REPLACE FUNCTION public.admin_approve_task_submission(submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    submission public.task_submissions%ROWTYPE;
    task_row public.tasks%ROWTYPE;
    payout_amount numeric;
BEGIN
    SELECT * INTO submission
    FROM public.task_submissions
    WHERE id = submission_id
    FOR UPDATE;

    IF submission.id IS NULL THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    IF submission.status IN ('APPROVED', 'COMPLETED', 'SUCCESS') THEN
        RETURN jsonb_build_object(
            'status', submission.status,
            'already_processed', true,
            'task_id', submission.task_id,
            'user_id', submission.user_id
        );
    END IF;

    SELECT * INTO task_row
    FROM public.tasks
    WHERE id = submission.task_id
    FOR UPDATE;

    IF task_row.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    payout_amount := COALESCE(task_row.reward, 0)::numeric;

    UPDATE public.task_submissions
    SET status = 'APPROVED'
    WHERE id = submission_id;

    INSERT INTO public.task_completions (task_id, user_id, status, reward, created_at)
    SELECT submission.task_id,
           submission.user_id,
           'APPROVED',
           payout_amount,
           NOW()
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.task_completions tc
        WHERE tc.task_id = submission.task_id
          AND tc.user_id = submission.user_id
    );

    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + payout_amount
    WHERE id = submission.user_id;

    INSERT INTO public.wallet_transactions (user_id, type, amount, description, reference, status, created_at)
    VALUES (
        submission.user_id,
        'TASK_REWARD',
        payout_amount,
        'Task approval reward',
        submission.id::text,
        'APPROVED',
        NOW()
    );

    RETURN jsonb_build_object(
        'status', 'APPROVED',
        'task_id', submission.task_id,
        'user_id', submission.user_id,
        'reward', payout_amount,
        'already_processed', false
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_withdrawal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    withdrawal_row public.withdrawals%ROWTYPE;
    fee_amount numeric;
BEGIN
    SELECT * INTO withdrawal_row
    FROM public.withdrawals
    WHERE id = p_withdrawal_id
    FOR UPDATE;

    IF withdrawal_row.id IS NULL THEN
        RAISE EXCEPTION 'Withdrawal not found';
    END IF;

    IF withdrawal_row.status <> 'pending' THEN
        RAISE EXCEPTION 'Withdrawal is no longer pending';
    END IF;

    fee_amount := COALESCE((
        SELECT free_withdrawal_fee
        FROM public.platform_settings
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
    ), 100)::numeric;

    IF COALESCE((SELECT balance FROM public.profiles WHERE id = withdrawal_row.user_id), 0) < withdrawal_row.amount THEN
        RAISE EXCEPTION 'User wallet balance is too low for this withdrawal';
    END IF;

    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) - withdrawal_row.amount
    WHERE id = withdrawal_row.user_id;

    INSERT INTO public.wallet_transactions (user_id, type, amount, description, reference, status, created_at)
    VALUES (
        withdrawal_row.user_id,
        'WITHDRAWAL',
        -ABS(withdrawal_row.amount),
        'Withdrawal approved',
        withdrawal_row.id::text,
        'APPROVED',
        NOW()
    );

    UPDATE public.withdrawals
    SET status = 'approved'
    WHERE id = p_withdrawal_id;

    RETURN jsonb_build_object(
        'withdrawal_id', withdrawal_row.id,
        'user_id', withdrawal_row.user_id,
        'amount', withdrawal_row.amount,
        'fee', fee_amount,
        'status', 'approved'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_task_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated;
