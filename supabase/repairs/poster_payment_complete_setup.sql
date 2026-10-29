-- NAIJA TASK: one-time manual poster payment proof setup.
-- Confirm the private Storage bucket exists with the exact ID "payment proof" before running.
-- This script does not create a public bucket and does not auto-publish tasks.
-- Admins must verify actual bank receipts in the receiving account before approving.

-- ===== BEGIN supabase/repairs/admin_approve_manual_poster_payment.sql =====
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

-- ===== END supabase/repairs/admin_approve_manual_poster_payment.sql =====

-- ===== BEGIN supabase/repairs/submit_poster_payment.sql =====
-- NAIJA TASK: secure RPC used by poster-payment.html for manual bank-transfer proof.
-- This is separate from Flutterwave verification. Admins must check the actual bank account.
create or replace function public.submit_poster_payment(
  p_task_id bigint,
  p_amount numeric,
  p_payment_method text,
  p_payment_reference text,
  p_proof_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_task public.tasks%rowtype;
  v_payment public.poster_payments%rowtype;
  v_expected_amount numeric;
  v_minimum_slots integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Please sign in before submitting payment proof.';
  end if;

  if p_task_id is null or p_task_id < 1 then
    raise exception 'A valid task ID is required.';
  end if;

  if length(trim(coalesce(p_payment_reference, ''))) < 3 then
    raise exception 'Enter the actual bank transfer reference.';
  end if;

  if upper(trim(coalesce(p_payment_method, ''))) not in ('BANK_TRANSFER', 'BANK_DEPOSIT') then
    raise exception 'Choose a supported manual bank payment method.';
  end if;

  if length(trim(coalesce(p_proof_url, ''))) = 0
     or split_part(p_proof_url, '/', 1) <> v_user_id::text
     or split_part(p_proof_url, '/', 2) <> p_task_id::text then
    raise exception 'The uploaded payment proof path is invalid for this account and task.';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id and created_by = v_user_id
  for update;

  if not found then
    raise exception 'Task not found or you do not own this task.';
  end if;

  if upper(coalesce(v_task.status, '')) not in ('PAYMENT_REQUIRED', 'REJECTED') then
    raise exception 'This task is not currently awaiting payment.';
  end if;

  if coalesce(v_task.active, false) then
    raise exception 'An active task cannot be paid again from this page.';
  end if;

  select coalesce(max(ps.minimum_poster_task_slots), 1)::integer
  into v_minimum_slots
  from public.platform_settings ps;

  if coalesce(v_task.slots, 0) < greatest(v_minimum_slots, 1) then
    raise exception 'This task does not meet the minimum poster task slot requirement.';
  end if;

  select public.get_poster_task_payment_amount(p_task_id)
  into v_expected_amount;

  if v_expected_amount is null or v_expected_amount <= 0
     or p_amount is null
     or round(p_amount, 2) <> round(v_expected_amount, 2) then
    raise exception 'The submitted amount does not match the server-calculated task funding amount.';
  end if;

  select * into v_payment
  from public.poster_payments
  where task_id = p_task_id and poster_id = v_user_id
  order by created_at desc
  limit 1
  for update;

  if found then
    if upper(coalesce(v_payment.status, '')) = 'APPROVED'
       or lower(coalesce(v_payment.payment_status, '')) = 'paid' then
      raise exception 'This task payment has already been approved or paid.';
    end if;

    if lower(coalesce(v_payment.payment_method, '')) = 'flutterwave'
       and (nullif(v_payment.tx_ref::text, '') is not null
            or nullif(v_payment.flw_transaction_id::text, '') is not null) then
      raise exception 'This task already has a Flutterwave transaction record. Do not mix payment methods; contact support if that transaction failed.';
    end if;

    if upper(coalesce(v_payment.status, '')) in ('PENDING', 'UNDER_REVIEW', 'PENDING_REVIEW')
       and length(trim(coalesce(v_payment.proof_url, ''))) > 0
       and length(trim(coalesce(v_payment.payment_reference, ''))) >= 3 then
      raise exception 'Payment proof is already awaiting review. Do not submit it twice.';
    end if;

    update public.poster_payments
    set amount = v_expected_amount,
        payment_method = upper(trim(p_payment_method)),
        payment_reference = trim(p_payment_reference),
        proof_url = trim(p_proof_url),
        status = 'UNDER_REVIEW',
        payment_status = 'pending',
        rejection_reason = null,
        reviewed_by = null,
        reviewed_at = null
    where id = v_payment.id
    returning * into v_payment;
  else
    insert into public.poster_payments (
      poster_id, task_id, amount, payment_method,
      payment_reference, proof_url, status, payment_status
    ) values (
      v_user_id, p_task_id, v_expected_amount, upper(trim(p_payment_method)),
      trim(p_payment_reference), trim(p_proof_url), 'UNDER_REVIEW', 'pending'
    )
    returning * into v_payment;
  end if;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'task_id', v_payment.task_id,
    'amount', v_expected_amount,
    'status', v_payment.status,
    'payment_status', v_payment.payment_status
  );
end;
$function$;

revoke all on function public.submit_poster_payment(bigint, numeric, text, text, text) from public;
grant execute on function public.submit_poster_payment(bigint, numeric, text, text, text) to authenticated;

-- ===== END supabase/repairs/submit_poster_payment.sql =====

-- ===== BEGIN supabase/repairs/payment_proof_storage_policies.sql =====
-- NAIJA TASK: private storage access for poster bank-transfer proof screenshots.
-- The bucket must already exist with the exact ID: payment proof.
-- Files are scoped to a user's own folder: <auth.uid>/<task_id>/<filename>.
-- Admins may read proof only to review payment submissions.

drop policy if exists "naija_task_upload_own_payment_proof" on storage.objects;
create policy "naija_task_upload_own_payment_proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment proof'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "naija_task_read_own_or_admin_payment_proof" on storage.objects;
create policy "naija_task_read_own_or_admin_payment_proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment proof'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
        and au.active = true
    )
  )
);

drop policy if exists "naija_task_delete_own_payment_proof" on storage.objects;
create policy "naija_task_delete_own_payment_proof"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment proof'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ===== END supabase/repairs/payment_proof_storage_policies.sql =====