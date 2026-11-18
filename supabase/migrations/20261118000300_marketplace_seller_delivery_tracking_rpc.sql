create or replace function public.marketplace_mark_order_delivered(
  p_order_id uuid,
  p_tracking_ref text,
  p_delivery_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare order_row public.marketplace_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in before updating delivery.'; end if;
  select * into order_row from public.marketplace_orders where id = p_order_id for update;
  if not found then raise exception 'Marketplace order not found.'; end if;
  if order_row.seller_id is distinct from auth.uid() then raise exception 'Only the seller for this order can update delivery.'; end if;
  if order_row.payment_status <> 'paid' or order_row.protection_status <> 'held' then
    raise exception 'Delivery updates are locked until the buyer payment is verified and held by the protected payment provider.';
  end if;
  if order_row.dispute_status not in ('none','resolved_seller') then raise exception 'This order is on hold because of a dispute.'; end if;
  if nullif(btrim(coalesce(p_tracking_ref,'')), '') is null and length(btrim(coalesce(p_delivery_note,''))) < 8 then
    raise exception 'Provide a delivery tracking reference or a delivery note of at least 8 characters.';
  end if;
  if order_row.delivery_status in ('delivered','buyer_confirmed') then raise exception 'Delivery has already been marked for this order.'; end if;
  update public.marketplace_orders
  set delivery_status = 'delivered',
      delivery_tracking_ref = nullif(btrim(coalesce(p_tracking_ref,'')), ''),
      delivery_note = coalesce(nullif(btrim(coalesce(p_delivery_note,'')), ''), delivery_note),
      status = 'delivered',
      updated_at = now()
  where id = p_order_id;
  return jsonb_build_object('success',true,'delivery_status','delivered',
    'release_after',(select payout_release_after from public.marketplace_orders where id=p_order_id));
end;
$$;
revoke all on function public.marketplace_mark_order_delivered(uuid,text,text) from public, anon;
grant execute on function public.marketplace_mark_order_delivered(uuid,text,text) to authenticated;
