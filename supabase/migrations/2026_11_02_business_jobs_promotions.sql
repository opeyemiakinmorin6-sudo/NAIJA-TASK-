-- NAIJA TASK: Business Job and paid promotion foundation
-- Apply in Supabase SQL Editor before deploying the matching Post Job page.
-- Existing task creation and Flutterwave checkout remain in place; the payment
-- Edge Function continues to call get_poster_task_payment_amount server-side.

alter table public.platform_settings
  add column if not exists fast_promotion_fee numeric not null default 500,
  add column if not exists priority_promotion_fee numeric not null default 1000,
  add column if not exists business_job_enabled boolean not null default true,
  add column if not exists business_job_fee numeric not null default 0;

alter table public.tasks
  add column if not exists task_kind text not null default 'normal_task',
  add column if not exists business_details jsonb not null default '{}'::jsonb,
  add column if not exists promotion_tier text not null default 'none';

alter table public.tasks drop constraint if exists tasks_task_kind_check;
alter table public.tasks add constraint tasks_task_kind_check
  check (task_kind in ('normal_task','business_job'));
alter table public.tasks drop constraint if exists tasks_promotion_tier_check;
alter table public.tasks add constraint tasks_promotion_tier_check
  check (promotion_tier in ('none','fast','priority'));

create or replace function public.create_poster_task(p_task jsonb)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_task public.tasks;
  v_min_slots integer;
  v_slots integer;
  v_reward numeric;
  v_kind text;
  v_promotion text;
  v_business_enabled boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select coalesce(minimum_poster_task_slots,10), coalesce(business_job_enabled,true)
    into v_min_slots, v_business_enabled
  from public.platform_settings limit 1;
  if v_min_slots is null or v_min_slots < 1 then v_min_slots := 10; end if;

  begin v_slots := (p_task->>'slots')::integer;
  exception when others then raise exception 'Task quantity must be a valid whole number'; end;
  if v_slots is null or v_slots < v_min_slots then
    raise exception 'This task requires at least % slots. Please increase the task quantity.', v_min_slots;
  end if;

  begin v_reward := (p_task->>'reward')::numeric;
  exception when others then raise exception 'Reward must be a valid number'; end;
  if v_reward is null or v_reward <= 0 then raise exception 'Reward per worker must be greater than zero'; end;

  v_kind := coalesce(nullif(p_task->>'task_kind',''),'normal_task');
  if v_kind not in ('normal_task','business_job') then raise exception 'Invalid job type'; end if;
  if v_kind = 'business_job' and not coalesce(v_business_enabled,true) then
    raise exception 'Business Job posting is currently disabled by NAIJA TASK.';
  end if;

  v_promotion := coalesce(nullif(p_task->>'promotion_tier',''),'none');
  if v_promotion not in ('none','fast','priority') then raise exception 'Invalid promotion option'; end if;

  insert into public.tasks (
    title,description,reward,slots,task_type,task_link,copy_text,created_by,
    requirements,active,status,task_kind,business_details,promotion_tier
  ) values (
    p_task->>'title',p_task->>'description',v_reward,v_slots,p_task->>'task_type',
    nullif(p_task->>'task_link',''),nullif(p_task->>'copy_text',''),auth.uid(),
    coalesce(p_task->'requirements','[]'::jsonb),false,'PAYMENT_REQUIRED',
    v_kind,coalesce(p_task->'business_details','{}'::jsonb),v_promotion
  ) returning * into v_task;

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
  v_promotion text;
  v_base_fee numeric;
  v_business_fee numeric;
  v_promotion_fee numeric := 0;
  v_fast_fee numeric;
  v_priority_fee numeric;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  select reward,slots,created_by,coalesce(task_kind,'normal_task'),coalesce(promotion_tier,'none')
    into v_reward,v_slots,v_owner,v_kind,v_promotion
  from public.tasks where id=p_task_id;

  if not found or v_owner is distinct from auth.uid() then raise exception 'Task not found or access denied'; end if;
  if coalesce(v_reward,0)<=0 or coalesce(v_slots,0)<1 then raise exception 'Invalid task reward or slots'; end if;

  select coalesce(poster_task_fee,500),coalesce(business_job_fee,0),
         coalesce(fast_promotion_fee,500),coalesce(priority_promotion_fee,1000)
    into v_base_fee,v_business_fee,v_fast_fee,v_priority_fee
  from public.platform_settings limit 1;

  if v_promotion='fast' then v_promotion_fee:=v_fast_fee; end if;
  if v_promotion='priority' then v_promotion_fee:=v_priority_fee; end if;

  return round((v_reward*v_slots)+coalesce(v_base_fee,500)
    + case when v_kind='business_job' then coalesce(v_business_fee,0) else 0 end
    + coalesce(v_promotion_fee,0),2);
end;
$function$;

revoke all on function public.get_poster_task_payment_amount(bigint) from public;
grant execute on function public.get_poster_task_payment_amount(bigint) to authenticated;
