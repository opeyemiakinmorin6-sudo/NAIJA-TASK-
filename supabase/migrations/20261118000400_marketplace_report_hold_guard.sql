create or replace function public.marketplace_process_due_releases()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare processed_count integer := 0;
begin
  with settings as (
    select coalesce(max(marketplace_commission_percent), 10)::numeric as commission_percent from public.platform_settings
  ),
  eligible as (
    select o.id,o.seller_id,o.total_amount,
      round(o.total_amount*s.commission_percent/100,2) as commission_amount,
      round(o.total_amount-(o.total_amount*s.commission_percent/100),2) as seller_net_amount
    from public.marketplace_orders o cross join settings s
    where o.payment_status='paid' and o.protection_status='held' and o.seller_id is not null
      and o.delivered_at is not null and (o.buyer_confirmed_at is not null or o.payout_release_after<=now())
      and o.dispute_status in ('none','resolved_seller')
      and o.payout_status in ('blocked','not_ready','pending','eligible')
      and not exists (select 1 from public.marketplace_disputes d where d.order_id=o.id and d.status in ('open','under_review','awaiting_evidence'))
      and not exists (select 1 from public.marketplace_reports r where (r.order_id=o.id or r.product_id=o.product_id)
        and r.status in ('open','triaged','under_review','upheld'))
  ),
  updated_orders as (
    update public.marketplace_orders o
    set marketplace_commission_amount=e.commission_amount,seller_net_amount=e.seller_net_amount,payout_status='eligible',updated_at=now()
    from eligible e where o.id=e.id and e.seller_net_amount>0
    returning o.id,o.seller_id,o.seller_net_amount
  ),
  inserted_payouts as (
    insert into public.marketplace_payouts(order_id,seller_id,amount,currency,status,idempotency_key)
    select u.id,u.seller_id,u.seller_net_amount,'NGN','eligible','marketplace-order:'||u.id::text
    from updated_orders u
    on conflict(order_id) do update
      set amount=excluded.amount,seller_id=excluded.seller_id,
          status=case when public.marketplace_payouts.status='blocked' then 'eligible' else public.marketplace_payouts.status end
      where public.marketplace_payouts.status in ('blocked','eligible')
    returning order_id
  )
  select count(*) into processed_count from inserted_payouts;
  return processed_count;
end;
$$;
revoke all on function public.marketplace_process_due_releases() from public,anon,authenticated;
grant execute on function public.marketplace_process_due_releases() to service_role;
