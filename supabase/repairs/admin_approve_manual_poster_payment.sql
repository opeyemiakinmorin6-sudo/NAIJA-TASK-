-- NAIJA TASK: admin-only review for manually transferred poster task funding.
-- Run in Supabase SQL Editor after the matching HTML changes are deployed.
-- Only approve after checking the actual receiving bank account; a screenshot alone is not verification.
create or replace function public.admin_approve_manual_poster_payment(
  p_payment_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_admin_id uuid;
  v_payment public.poster_payments%rowtype;
  v_expected_amount numeric;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Administrator sign-in is required.';
  end if;

  if not exists (
    select 1 from public.admin_users au
    where au.user_id = v_admin_id and au.active = true
  ) then
    raise exception 'Only an active NAIJA TASK administrator can approve payments.';
  end if;

  select * into v_payment
  from public.poster_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Poster payment record was not found.';
  end if;

  if lower(coalesce(v_payment.payment_method, '')) = 'flutterwave' then
    raise exception 'Flutterwave payments must use the Flutterwave verification workflow.';
  end if;

  if upper(coalesce(v_payment.status, '')) = 'APPROVED'
     and lower(coalesce(v_payment.payment_status, '')) = 'paid' then
    return jsonb_build_object(
      'success', true,
      'already_approved', true,
      'payment_id', v_payment.id,
      'task_id', v_payment.task_id
    );
  end if;

  if upper(coalesce(v_payment.status, '')) not in ('PENDING', 'UNDER_REVIEW', 'PENDING_REVIEW', 'REJECTED') then
    raise exception 'This manual payment is not awaiting review.';
  end if;

  if length(trim(coalesce(v_payment.payment_reference, ''))) < 3
     or length(trim(coalesce(v_payment.proof_url, ''))) = 0 then
    raise exception 'Payment reference and proof screenshot are both required.';
  end if;

  select public.get_poster_task_payment_amount(v_payment.task_id)
  into v_expected_amount;

  if v_expected_amount is null
     or round(v_payment.amount::numeric, 2) <> round(v_expected_amount::numeric, 2) then
    raise exception 'The payment amount does not match the server-calculated task funding amount.';
  end if;

  update public.poster_payments
  set status = 'APPROVED',
      confirmed_by = v_admin_id,
      confirmed_at = now(),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = null,
      payment_status = 'paid'
  where id = v_payment.id;

  update public.tasks
  set payment_status = 'PAID',
      active = false
  where id = v_payment.task_id
    and created_by = v_payment.poster_id;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'task_id', v_payment.task_id,
    'payment_status', 'paid',
    'task_published', false
  );
end;
$function$;

revoke all on function public.admin_approve_manual_poster_payment(bigint) from public;
grant execute on function public.admin_approve_manual_poster_payment(bigint) to authenticated;
