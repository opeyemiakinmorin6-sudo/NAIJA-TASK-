-- NAIJA TASK: repair poster task schema and secure checkout functions.
-- Safe to re-run. Preserves existing rows and existing configured prices.

begin;

alter table public.platform_settings
  add column if not exists minimum_poster_task_slots integer not null default 10,
  add column if not exists poster_task_fee numeric not null default 500,
  add column if not exists service_pricing jsonb not null default '{}'::jsonb,
  add column if not exists fast_promotion_fee numeric not null default 500,
  add column if not exists priority_promotion_fee numeric not null default 1000,
  add column if not exists business_job_enabled boolean not null default true,
  add column if not exists business_job_fee numeric not null default 0;

alter table public.tasks
  add column if not exists task_kind text not null default 'normal_task',
  add column if not exists business_details jsonb not null default '{}'::jsonb,
  add column if not exists promotion_tier text not null default 'none';

alter table public.tasks
  alter column task_kind set default 'normal_task',
  alter column business_details set default '{}'::jsonb,
  alter column promotion_tier set default 'none';

update public.tasks
set task_kind = 'normal_task'
where task_kind is null or btrim(task_kind) = '';

update public.tasks
set business_details = '{}'::jsonb
where business_details is null;

update public.tasks
set promotion_tier = 'none'
where promotion_tier is null or btrim(promotion_tier) = '';

alter table public.tasks drop constraint if exists tasks_task_kind_check;
alter table public.tasks
  add constraint tasks_task_kind_check
  check (task_kind in ('normal_task','business_job'));

alter table public.tasks drop constraint if exists tasks_promotion_tier_check;
alter table public.tasks
  add constraint tasks_promotion_tier_check
  check (promotion_tier in ('none','fast','priority'));

create or replace function public.create_poster_task(p_task jsonb)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_task public.tasks;
  v_min_slots integer := 10;
  v_slots integer;
  v_reward numeric;
  v_kind text;
  v_promotion text;
  v_business_enabled boolean := true;
  v_title text;
  v_description text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_task is null or jsonb_typeof(p_task) <> 'object' then
    raise exception 'Invalid task details';
  end if;

  select greatest(10, coalesce(minimum_poster_task_slots,10)),
         coalesce(business_job_enabled,true)
    into v_min_slots, v_business_enabled
  from public.platform_settings
  order by id
  limit 1;

  v_min_slots := greatest(10, coalesce(v_min_slots,10));

  v_title := nullif(btrim(p_task->>'title'),'');
  v_description := nullif(btrim(p_task->>'description'),'');

  if v_title is null then
    raise exception 'Please enter a task title';
  end if;

  if v_description is null then
    raise exception 'Please enter task instructions';
  end if;

  begin
    v_slots := (p_task->>'slots')::integer;
  exception when others then
    raise exception 'Task quantity must be a valid whole number';
  end;

  if v_slots is null or v_slots < v_min_slots then
    raise exception 'This task requires at least % slots. Please increase the task quantity.', v_min_slots;
  end if;

  begin
    v_reward := (p_task->>'reward')::numeric;
  exception when others then
    raise exception 'Reward must be a valid number';
  end;

  if v_reward is null or v_reward <= 0 then
    raise exception 'Reward per worker must be greater than zero';
  end if;

  v_kind := coalesce(nullif(p_task->>'task_kind',''),'normal_task');

  if v_kind not in ('normal_task','business_job') then
    raise exception 'Invalid job type';
  end if;

  if v_kind = 'business_job' and not coalesce(v_business_enabled,true) then
    raise exception 'Business Job posting is currently disabled by NAIJA TASK.';
  end if;

  v_promotion := coalesce(nullif(p_task->>'promotion_tier',''),'none');

  if v_promotion not in ('none','fast','priority') then
    raise exception 'Invalid promotion option';
  end if;

  if v_kind = 'business_job' and
     coalesce(nullif(p_task->'business_details'->>'business_name',''),'') = '' then
    raise exception 'Business name is required';
  end if;

  insert into public.tasks (
    title, description, reward, slots, task_type, task_link, copy_text,
    created_by, requirements, active, status, task_kind,
    business_details, promotion_tier
  )
  values (
    v_title,
    v_description,
    v_reward,
    v_slots,
    nullif(p_task->>'task_type',''),
    nullif(p_task->>'task_link',''),
    nullif(p_task->>'copy_text',''),
    auth.uid(),
    coalesce(p_task->'requirements','[]'::jsonb),
    false,
    'PAYMENT_REQUIRED',
    v_kind,
    coalesce(p_task->'business_details','{}'::jsonb),
    v_promotion
  )
  returning * into v_task;

  return v_task;
end;
$function$;

revoke all on function public.create_poster_task(jsonb) from public;
grant execute on function public.create_poster_task(jsonb) to authenticated;

create or replace function public.get_poster_task_payment_amount(p_task_id bigint)
returns numeric
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_reward numeric;
  v_slots integer;
  v_owner uuid;
  v_kind text;
  v_business_details jsonb;
  v_task_type text;
  v_promotion text;
  v_pricing jsonb;
  v_item jsonb;
  v_service_key text;
  v_group text;
  v_base_fee numeric := 500;
  v_service_fee numeric := 0;
  v_promotion_fee numeric := 0;
  v_min_slots integer := 10;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select t.reward, t.slots, t.created_by, t.task_kind,
         t.business_details, t.task_type, t.promotion_tier
    into v_reward, v_slots, v_owner, v_kind,
         v_business_details, v_task_type, v_promotion
  from public.tasks t
  where t.id = p_task_id
    and t.created_by = auth.uid();

  if not found then
    raise exception 'Task not found or access denied';
  end if;

  if coalesce(v_reward,0) <= 0 or coalesce(v_slots,0) < 1 then
    raise exception 'Invalid task reward or quantity';
  end if;

  select coalesce(ps.service_pricing,'{}'::jsonb),
         greatest(0,coalesce(ps.poster_task_fee,500)),
         greatest(10,coalesce(ps.minimum_poster_task_slots,10))
    into v_pricing, v_base_fee, v_min_slots
  from public.platform_settings ps
  order by ps.id
  limit 1;

  if not found then
    raise exception 'Platform pricing settings are unavailable';
  end if;

  if v_slots < v_min_slots then
    raise exception 'This task requires at least % slots.', v_min_slots;
  end if;

  if coalesce(v_kind,'normal_task') = 'business_job' then
    v_group := 'business';
    v_service_key := nullif(v_business_details->>'service_type','');
  else
    v_group := 'social';
    v_service_key := coalesce(v_task_type,'general');
    v_service_key := case v_service_key
      when 'website' then 'website_blog'
      when 'app_download' then 'playstore_appstore'
      when 'survey' then 'survey_task'
      else v_service_key
    end;
  end if;

  if v_service_key is not null then
    v_item := v_pricing #> array[v_group,v_service_key];

    if v_item is not null then
      if coalesce((v_item->>'enabled')::boolean,true) is false then
        raise exception 'This service is currently disabled by NAIJA TASK.';
      end if;

      v_service_fee := greatest(0,coalesce((v_item->>'fee')::numeric,0));
    end if;
  end if;

  case coalesce(v_promotion,'none')
    when 'fast' then
      v_promotion_fee := greatest(0,coalesce((v_pricing->>'fast_fee')::numeric,500));
    when 'priority' then
      v_promotion_fee := greatest(0,coalesce((v_pricing->>'priority_fee')::numeric,1000));
    when 'none' then
      v_promotion_fee := 0;
    else
      raise exception 'Invalid promotion option';
  end case;

  return round((v_reward * v_slots) + v_base_fee +
    v_service_fee + v_promotion_fee, 2);
end;
$function$;

revoke all on function public.get_poster_task_payment_amount(bigint) from public;
grant execute on function public.get_poster_task_payment_amount(bigint) to authenticated;

commit;
