-- NAIJA TASK: align secure poster checkout with Admin's saved service pricing.
-- Apply in Supabase SQL Editor. This changes the server-calculated amount only;
-- Flutterwave verification and the moderation gate remain unchanged.

create or replace function public.get_poster_task_payment_amount(p_task_id bigint)
returns numeric
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_task public.tasks%rowtype;
  v_settings public.platform_settings%rowtype;
  v_pricing jsonb;
  v_item jsonb;
  v_service_key text;
  v_group text;
  v_promotion_fee numeric := 0;
  v_service_fee numeric := 0;
  v_base_fee numeric := 500;
  v_min_slots integer := 10;
  v_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id and created_by = auth.uid();

  if not found then
    raise exception 'Task not found or access denied';
  end if;

  if coalesce(v_task.reward, 0) <= 0 or coalesce(v_task.slots, 0) < 1 then
    raise exception 'Invalid task reward or quantity';
  end if;

  select * into v_settings
  from public.platform_settings
  order by id
  limit 1;

  if not found then
    raise exception 'Platform pricing settings are unavailable';
  end if;

  v_pricing := coalesce(v_settings.service_pricing, '{}'::jsonb);
  v_min_slots := greatest(
    10,
    coalesce(nullif(v_settings.minimum_poster_task_slots, 0), 10),
    coalesce(nullif((v_pricing->>'min_slots')::integer, 0), 10)
  );

  if v_task.slots < v_min_slots then
    raise exception 'This task requires at least % slots.', v_min_slots;
  end if;

  v_base_fee := greatest(0, coalesce(v_settings.poster_task_fee, 500));

  if coalesce(v_task.task_kind, 'normal_task') = 'business_job' then
    v_group := 'business';
    v_service_key := nullif(v_task.business_details->>'service_type', '');
  else
    v_group := 'social';
    v_service_key := coalesce(v_task.task_type, 'general');
    v_service_key := case v_service_key
      when 'website' then 'website_blog'
      when 'app_download' then 'playstore_appstore'
      when 'survey' then 'survey_task'
      else v_service_key
    end;
  end if;

  if v_service_key is not null then
    v_item := v_pricing #> array[v_group, v_service_key];

    if v_item is not null then
      if coalesce((v_item->>'enabled')::boolean, true) is false then
        raise exception 'This service is currently disabled by NAIJA TASK.';
      end if;
      v_service_fee := greatest(0, coalesce((v_item->>'fee')::numeric, 0));
    end if;
  end if;

  case coalesce(v_task.promotion_tier, 'none')
    when 'fast' then
      v_promotion_fee := greatest(0, coalesce((v_pricing->>'fast_fee')::numeric, 500));
    when 'priority' then
      v_promotion_fee := greatest(0, coalesce((v_pricing->>'priority_fee')::numeric, 1000));
    when 'none' then
      v_promotion_fee := 0;
    else
      raise exception 'Invalid promotion option';
  end case;

  v_amount := (v_task.reward::numeric * v_task.slots)
    + v_base_fee
    + v_service_fee
    + v_promotion_fee;

  return round(v_amount, 2);
end;
$function$;

revoke all on function public.get_poster_task_payment_amount(bigint) from public;
grant execute on function public.get_poster_task_payment_amount(bigint) to authenticated;
