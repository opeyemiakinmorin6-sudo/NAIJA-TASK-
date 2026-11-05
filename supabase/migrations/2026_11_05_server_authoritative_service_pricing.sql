-- NAIJA TASK: server-authoritative per-service pricing.
-- Admin config format: service_pricing[group][service_key] =
-- { enabled: true, poster_price: 35, tasker_reward: 20 }
-- Unconfigured services remain unavailable. Existing tasks keep their saved reward.
begin;

alter table public.tasks
  add column if not exists service_key text,
  add column if not exists poster_rate_per_slot numeric,
  add column if not exists tasker_reward_per_slot numeric,
  add column if not exists platform_margin_per_slot numeric,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

create or replace function public.apply_poster_service_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_kind text;
  v_group text;
  v_key text;
  v_pricing jsonb;
  v_item jsonb;
  v_poster numeric;
  v_worker numeric;
begin
  if coalesce(new.status,'') <> 'PAYMENT_REQUIRED'
     or new.created_by is null then
    return new;
  end if;

  v_kind := coalesce(new.task_kind,'normal_task');
  if v_kind = 'business_job' then
    v_group := 'business';
    v_key := nullif(new.business_details->>'service_type','');
  else
    v_group := 'social';
    v_key := coalesce(nullif(new.task_type,''),'general');
    v_key := case v_key
      when 'website' then 'website_blog'
      when 'survey' then 'survey_task'
      when 'app_download' then 'app_testing'
      else v_key
    end;
  end if;

  -- Only genuine work, research, testing and creative services are supported.
  if v_group = 'social' and v_key not in
    ('website_blog','survey_task','traffic_seo','other',
     'app_testing') then
    raise exception 'This service is unavailable. Choose a genuine testing, research or business service.';
  end if;
  if v_group = 'business' and v_key not in
    ('product_testing','website_testing','app_testing','survey_research',
     'writing_content','graphic_design','video_audio','data_admin',
     'business_support','translation_transcription','other_business') then
    raise exception 'Invalid business service.';
  end if;

  select coalesce(service_pricing,'{}'::jsonb)
    into v_pricing
  from public.platform_settings
  order by id
  limit 1;

  v_item := v_pricing #> array[v_group,v_key];
  if v_item is null or coalesce((v_item->>'enabled')::boolean,false) is false then
    raise exception 'This service is not currently available.';
  end if;

  begin
    v_poster := (v_item->>'poster_price')::numeric;
    v_worker := (v_item->>'tasker_reward')::numeric;
  exception when others then
    raise exception 'The service price has not been configured correctly.';
  end;

  if v_poster is null or v_worker is null
     or v_poster < 1 or v_poster > 999
     or v_worker < 1 or v_worker > 999
     or v_worker > v_poster then
    raise exception 'Service pricing is invalid. Contact NAIJA TASK support.';
  end if;

  new.service_key := v_key;
  new.poster_rate_per_slot := v_poster;
  new.tasker_reward_per_slot := v_worker;
  new.platform_margin_per_slot := v_poster - v_worker;
  new.reward := v_worker;
  new.pricing_snapshot := jsonb_build_object(
    'group',v_group,'service_key',v_key,
    'poster_price',v_poster,'tasker_reward',v_worker,
    'platform_margin',v_poster-v_worker,
    'captured_at',now()
  );
  return new;
end;
$function$;

drop trigger if exists trg_apply_poster_service_pricing on public.tasks;
create trigger trg_apply_poster_service_pricing
before insert on public.tasks
for each row execute function public.apply_poster_service_pricing();

create or replace function public.get_poster_task_payment_amount(p_task_id bigint)
returns numeric
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_task public.tasks;
  v_base_fee numeric := 500;
  v_promo numeric := 0;
  v_pricing jsonb;
  v_min_slots integer := 10;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;

  select * into v_task
  from public.tasks
  where id = p_task_id and created_by = auth.uid();

  if not found then raise exception 'Task not found or access denied'; end if;
  if coalesce(v_task.slots,0) < 10 then raise exception 'Minimum task quantity is 10'; end if;
  if coalesce(v_task.poster_rate_per_slot,0) < 1
     or coalesce(v_task.tasker_reward_per_slot,0) < 1 then
    raise exception 'This task has no valid saved pricing. Please recreate it.';
  end if;

  select coalesce(service_pricing,'{}'::jsonb),
         greatest(0,coalesce(poster_task_fee,500)),
         greatest(10,coalesce(minimum_poster_task_slots,10))
    into v_pricing,v_base_fee,v_min_slots
  from public.platform_settings
  order by id limit 1;

  if v_task.slots < v_min_slots then
    raise exception 'This task requires at least % slots.',v_min_slots;
  end if;

  case coalesce(v_task.promotion_tier,'none')
    when 'fast' then v_promo := greatest(0,coalesce((v_pricing->>'fast_fee')::numeric,500));
    when 'priority' then v_promo := greatest(0,coalesce((v_pricing->>'priority_fee')::numeric,1000));
    when 'none' then v_promo := 0;
    else raise exception 'Invalid promotion option';
  end case;

  return round((v_task.poster_rate_per_slot * v_task.slots) + v_base_fee + v_promo,2);
end;
$function$;

revoke all on function public.get_poster_task_payment_amount(bigint) from public;
grant execute on function public.get_poster_task_payment_amount(bigint) to authenticated;

commit;
