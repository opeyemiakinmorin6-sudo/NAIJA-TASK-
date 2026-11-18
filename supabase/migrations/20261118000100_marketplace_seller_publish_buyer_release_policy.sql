-- NAIJA TASK marketplace: seller self-publishing + protected release eligibility.
-- This migration does NOT transfer money or claim that Flutterwave escrow is enabled.

alter table public.platform_settings
  add column if not exists marketplace_commission_percent numeric(5,2) not null default 10;
alter table public.platform_settings
  drop constraint if exists platform_settings_marketplace_commission_percent_check;
alter table public.platform_settings
  add constraint platform_settings_marketplace_commission_percent_check
  check (marketplace_commission_percent >= 0 and marketplace_commission_percent <= 30);

alter table public.marketplace_orders
  add column if not exists marketplace_commission_amount numeric(12,2) not null default 0,
  add column if not exists seller_net_amount numeric(12,2) not null default 0;

create or replace function public.marketplace_validate_listing()
returns trigger language plpgsql
set search_path = public, auth, pg_temp
as $$
declare required_image_prefix text;
begin
  if new.seller_id is null then raise exception 'A seller account is required to submit a product.'; end if;
  if auth.uid() is not null and new.seller_id <> auth.uid() then raise exception 'You can only submit products under your own seller account.'; end if;
  required_image_prefix := 'https://jwakveeiynpakunwjzkj.supabase.co/storage/v1/object/public/marketplace-images/' || new.seller_id::text || '/';
  if nullif(btrim(coalesce(new.image_url,'')), '') is null or left(new.image_url, length(required_image_prefix)) <> required_image_prefix then
    raise exception 'Upload at least one original product photo through the NAIJA TASK marketplace photo uploader before submitting.';
  end if;
  if nullif(btrim(coalesce(new.title,'')), '') is null or nullif(btrim(coalesce(new.description,'')), '') is null
     or new.price is null or new.price <= 0 or new.stock is null or new.stock < 1 then
    raise exception 'Complete the product details, price and available quantity before submitting.';
  end if;
  new.status := 'active';
  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists marketplace_insert_own on public.marketplace;
create policy marketplace_insert_own on public.marketplace
for insert to authenticated with check (auth.uid() = seller_id and status = 'active');

create or replace function public.marketplace_set_delivery_release_deadline()
returns trigger language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.delivery_status = 'delivered' and old.delivery_status is distinct from 'delivered' then
    if new.payment_status <> 'paid' then raise exception 'A marketplace order must be paid before delivery can be marked complete.'; end if;
    if nullif(btrim(coalesce(new.delivery_tracking_ref,'')), '') is null and nullif(btrim(coalesce(new.delivery_note,'')), '') is null then
      raise exception 'Add delivery tracking or delivery evidence before marking this order delivered.';
    end if;
    new.delivered_at := coalesce(new.delivered_at, now());
    new.payout_release_after := new.delivered_at + interval '48 hours';
    new.payout_status := 'blocked';
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_delivery_release_deadline on public.marketplace_orders;
create trigger marketplace_delivery_release_deadline
before update of delivery_status on public.marketplace_orders
for each row execute function public.marketplace_set_delivery_release_deadline();

create or replace function public.marketplace_after_delivery_confirmation()
returns trigger language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare order_row public.marketplace_orders%rowtype;
begin
  select * into order_row from public.marketplace_orders where id = new.order_id for update;
  if not found then raise exception 'Marketplace order not found.'; end if;

  if new.party_role = 'buyer' and new.confirmation = 'confirmed' then
    if order_row.buyer_id is distinct from new.confirmer_id then raise exception 'Only the buyer can confirm receipt.'; end if;
    if order_row.payment_status <> 'paid' or order_row.delivery_status <> 'delivered' or order_row.delivered_at is null then
      raise exception 'The seller must first record delivery before the buyer can confirm receipt.';
    end if;
    update public.marketplace_orders
    set buyer_confirmed_at = coalesce(buyer_confirmed_at, now()),
        delivery_status = 'buyer_confirmed',
        payout_release_after = now(),
        payout_status = case when protection_status = 'held' and dispute_status in ('none','resolved_seller') then 'pending' else 'blocked' end,
        updated_at = now()
    where id = new.order_id;
  elsif new.party_role = 'seller' and new.confirmation = 'confirmed' then
    if order_row.seller_id is distinct from new.confirmer_id then raise exception 'Only the seller can submit seller confirmation.'; end if;
    update public.marketplace_orders set seller_confirmed_at = coalesce(seller_confirmed_at, now()), updated_at = now() where id = new.order_id;
  end if;
  return new;
end;
$$;

create or replace function public.marketplace_sync_dispute_resolution()
returns trigger language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.status in ('resolved_buyer','resolved_seller','cancelled') then
    new.resolved_at := coalesce(new.resolved_at, now());
    new.resolved_by := coalesce(new.resolved_by, auth.uid());
  else
    new.resolved_at := null;
    new.resolved_by := null;
  end if;
  update public.marketplace_orders o
  set dispute_status = new.status,
      payout_status = case
        when new.status in ('open','under_review','awaiting_evidence','resolved_buyer','cancelled') then 'blocked'
        when new.status = 'resolved_seller' and o.protection_status = 'held' and o.delivered_at is not null
          and (o.buyer_confirmed_at is not null or o.payout_release_after <= now()) then 'pending'
        else o.payout_status end,
      updated_at = now()
  where o.id = new.order_id;
  return new;
end;
$$;

create or replace function public.marketplace_process_due_releases()
returns integer language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare processed_count integer := 0;
begin
  with settings as (
    select coalesce(max(marketplace_commission_percent), 10)::numeric as commission_percent from public.platform_settings
  ),
  eligible as (
    select o.id, o.seller_id, o.total_amount,
      round(o.total_amount * s.commission_percent / 100, 2) as commission_amount,
      round(o.total_amount - (o.total_amount * s.commission_percent / 100), 2) as seller_net_amount
    from public.marketplace_orders o cross join settings s
    where o.payment_status = 'paid' and o.protection_status = 'held' and o.seller_id is not null
      and o.delivered_at is not null and (o.buyer_confirmed_at is not null or o.payout_release_after <= now())
      and o.dispute_status in ('none','resolved_seller') and o.payout_status in ('blocked','not_ready','pending','eligible')
      and not exists (select 1 from public.marketplace_disputes d where d.order_id = o.id and d.status in ('open','under_review','awaiting_evidence'))
      and not exists (select 1 from public.marketplace_reports r where r.order_id = o.id and r.status = 'open')
  ),
  updated_orders as (
    update public.marketplace_orders o
    set marketplace_commission_amount = e.commission_amount, seller_net_amount = e.seller_net_amount,
        payout_status = 'eligible', updated_at = now()
    from eligible e where o.id = e.id and e.seller_net_amount > 0
    returning o.id, o.seller_id, o.seller_net_amount
  ),
  inserted_payouts as (
    insert into public.marketplace_payouts (order_id,seller_id,amount,currency,status,idempotency_key)
    select u.id,u.seller_id,u.seller_net_amount,'NGN','eligible','marketplace-order:' || u.id::text
    from updated_orders u
    on conflict (order_id) do update
      set amount = excluded.amount, seller_id = excluded.seller_id,
          status = case when public.marketplace_payouts.status = 'blocked' then 'eligible' else public.marketplace_payouts.status end
      where public.marketplace_payouts.status in ('blocked','eligible')
    returning order_id
  )
  select count(*) into processed_count from inserted_payouts;
  return processed_count;
end;
$$;

revoke all on function public.marketplace_process_due_releases() from public, anon, authenticated;
grant execute on function public.marketplace_process_due_releases() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'naija-task-marketplace-release-checks') then
    perform cron.unschedule('naija-task-marketplace-release-checks');
  end if;
  perform cron.schedule('naija-task-marketplace-release-checks','*/5 * * * *','select public.marketplace_process_due_releases();');
end;
$$;
