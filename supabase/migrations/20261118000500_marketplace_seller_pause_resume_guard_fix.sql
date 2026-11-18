create or replace function public.marketplace_guard_listing_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare actor_is_admin boolean := false; required_image_prefix text;
begin
  if new.seller_id is distinct from old.seller_id then raise exception 'A listing cannot be transferred to another seller.'; end if;
  required_image_prefix := 'https://jwakveeiynpakunwjzkj.supabase.co/storage/v1/object/public/marketplace-images/' || new.seller_id::text || '/';
  if nullif(btrim(coalesce(new.image_url,'')), '') is null or left(new.image_url,length(required_image_prefix)) <> required_image_prefix then
    raise exception 'Keep at least one photo uploaded through the NAIJA TASK marketplace photo uploader.';
  end if;
  if auth.uid() is not null then
    select exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.active=true) into actor_is_admin;
    if not actor_is_admin then
      if auth.uid() is distinct from old.seller_id then raise exception 'You can only edit your own marketplace listing.'; end if;
      if new.status is distinct from old.status and not (
        (old.status='active' and new.status='inactive') or (old.status='inactive' and new.status='active')
      ) then raise exception 'Sellers may only pause or resume their own active listings.'; end if;
      if nullif(btrim(coalesce(new.title,'')), '') is null or nullif(btrim(coalesce(new.description,'')), '') is null
         or new.price is null or new.price<=0 or new.stock is null or new.stock<1 then
        raise exception 'Complete the product details, price and available quantity before saving.';
      end if;
    end if;
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
