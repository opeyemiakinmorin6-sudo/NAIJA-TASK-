drop policy if exists marketplace_public_read on public.marketplace;
create policy marketplace_public_read
on public.marketplace
for select to authenticated
using (
  auth.uid() = seller_id
  or (
    status = 'active'
    and not exists (
      select 1 from public.marketplace_product_moderation m
      where m.product_id = marketplace.id
        and m.status in ('hidden','rejected')
    )
  )
);
