-- Fix buyer order requests being rejected by the listing row lock.
-- Buyers can SELECT active listings but cannot UPDATE/lock sellers' listing rows.
-- The order is only a request (checkout is disabled), so no stock is reserved here.

create or replace function public.marketplace_prepare_order()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $function$
declare
  product_row public.marketplace%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in before creating a marketplace order.';
  end if;

  new.buyer_id := auth.uid();
  new.quantity := coalesce(new.quantity, 1);

  if new.quantity < 1 or new.quantity > 100 then
    raise exception 'Order quantity must be between 1 and 100.';
  end if;

  select * into product_row
  from public.marketplace
  where id = new.product_id
    and status = 'active';

  if not found then
    raise exception 'This product is not available for purchase.';
  end if;

  if product_row.seller_id = auth.uid() then
    raise exception 'You cannot purchase your own product.';
  end if;

  if product_row.price is null or product_row.price <= 0 then
    raise exception 'This product has an invalid price and cannot be ordered.';
  end if;

  if product_row.stock is null or product_row.stock < new.quantity then
    raise exception 'There is not enough stock available for this quantity.';
  end if;

  new.seller_id := product_row.seller_id;
  new.unit_price := product_row.price;
  new.total_amount := round(product_row.price * new.quantity, 2);
  new.status := 'order_request_pending';
  new.delivery_status := 'pending';
  new.payment_status := 'pending';
  new.protection_status := 'not_configured';
  new.payout_status := 'not_ready';
  new.dispute_status := 'none';
  new.tx_ref := null;
  new.flw_transaction_id := null;
  new.paid_at := null;
  new.dispatched_at := null;
  new.delivered_at := null;
  new.buyer_confirmed_at := null;
  new.seller_confirmed_at := null;
  new.payout_release_after := null;
  return new;
end;
$function$;
