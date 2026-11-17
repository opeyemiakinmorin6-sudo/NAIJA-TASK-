alter table public.tasks
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.tasks'::regclass
      and conname='tasks_cancellation_reason_length_check'
  ) then
    alter table public.tasks
      add constraint tasks_cancellation_reason_length_check
      check (
        cancellation_reason is null
        or char_length(btrim(cancellation_reason)) between 20 and 500
      );
  end if;
end
$$;

create index if not exists task_activity_task_started_user_idx
  on public.task_activity(task_id, activity_type, user_id);
create index if not exists task_submissions_task_user_idx
  on public.task_submissions(task_id, user_id);
create index if not exists task_completions_task_user_idx
  on public.task_completions(task_id, user_id);

create or replace function private.poster_cancel_task(p_task_id bigint, p_reason text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_notified integer := 0;
begin
  if v_user_id is null then raise exception 'Please sign in with your Poster account.'; end if;
  if char_length(v_reason) < 20 or char_length(v_reason) > 500 then
    raise exception 'A genuine cancellation reason of 20 to 500 characters is required.';
  end if;
  if not exists (select 1 from public.profiles p where p.id=v_user_id and lower(coalesce(p.role,'')) in ('task_poster','poster')) then
    raise exception 'Only the Poster who owns this task can cancel it.';
  end if;
  select * into v_task from public.tasks t where t.id=p_task_id and t.created_by=v_user_id for update;
  if not found then raise exception 'Task not found in your Poster account.'; end if;
  if upper(coalesce(v_task.status,''))='CANCELLED' then raise exception 'This task has already been cancelled.'; end if;
  if upper(coalesce(v_task.status,'')) not in ('LIVE','ACTIVE','PUBLISHED','APPROVED','APPROVED_BY_ADMIN','OPEN','PAUSED') then
    raise exception 'Only a live or paused task can be cancelled from My Jobs.';
  end if;

  update public.tasks
  set status='CANCELLED', active=false, cancellation_reason=v_reason, cancelled_at=now(), cancelled_by=v_user_id
  where id=v_task.id;

  with recipients as (
    select ta.user_id from public.task_activity ta
    where ta.task_id=v_task.id and upper(coalesce(ta.activity_type,''))='STARTED'
    union
    select ts.user_id from public.task_submissions ts where ts.task_id=v_task.id
    union
    select tc.user_id from public.task_completions tc where tc.task_id=v_task.id
  ), eligible as (
    select distinct r.user_id from recipients r
    join public.profiles p on p.id=r.user_id
    where r.user_id is not null and r.user_id<>v_user_id
      and lower(coalesce(p.role,'')) in ('tasker','user')
  )
  insert into public.notifications(user_id,title,message,type,is_read,created_at)
  select e.user_id,
    'Task cancelled by Poster',
    format('Task #%s — %s was cancelled by the Poster. Poster’s reason: %s. Please stop any further work. If you completed the task before cancellation or believe the reason affects proof you already submitted, keep your screenshot and contact Support Centre for a review.',
      v_task.id,left(coalesce(v_task.title,'Untitled task'),160),v_reason),
    'task_cancelled',false,now()
  from eligible e
  where not exists (
    select 1 from public.notifications n
    where n.user_id=e.user_id and n.type='task_cancelled'
      and n.message like ('Task #'||v_task.id::text||' —%')
  );
  get diagnostics v_notified=row_count;
  return jsonb_build_object('task_id',v_task.id,'status','CANCELLED','notified_taskers',v_notified,
    'existing_submissions_preserved',true,'automatic_refund',false);
end;
$function$;

create or replace function public.poster_cancel_task(p_task_id bigint, p_reason text)
returns jsonb language sql security invoker
set search_path = pg_catalog, public, private
as $function$ select private.poster_cancel_task(p_task_id,p_reason); $function$;

create or replace function private.submit_tasker_task_report(p_task_id bigint, p_reason text)
returns bigint language plpgsql security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_user_id uuid := auth.uid();
  v_poster_id uuid;
  v_title text;
  v_reason text := btrim(coalesce(p_reason,''));
  v_report_id bigint;
begin
  if v_user_id is null then raise exception 'Please sign in before reporting a task.'; end if;
  if not exists (select 1 from public.profiles p where p.id=v_user_id and lower(coalesce(p.role,'')) in ('tasker','user')) then
    raise exception 'Only Tasker accounts can submit task reports here.';
  end if;
  if p_task_id is null or p_task_id<1 then raise exception 'Enter a valid task reference number.'; end if;
  if char_length(v_reason)<20 or char_length(v_reason)>1200 then
    raise exception 'Please explain the concern in 20 to 1,200 characters.';
  end if;
  select t.created_by,t.title into v_poster_id,v_title from public.tasks t where t.id=p_task_id;
  if not found or v_poster_id is null then raise exception 'The task reference could not be found.'; end if;
  if v_poster_id=v_user_id then raise exception 'You cannot report your own task.'; end if;
  if not exists (
    select 1 from public.task_activity ta where ta.task_id=p_task_id and ta.user_id=v_user_id
      and upper(coalesce(ta.activity_type,''))='STARTED'
  ) and not exists (
    select 1 from public.task_submissions ts where ts.task_id=p_task_id and ts.user_id=v_user_id
  ) then
    raise exception 'Open the task first or report a task you have already submitted.';
  end if;
  v_report_id:=public.submit_trust_safety_report(
    v_poster_id,'OTHER',v_reason,
    jsonb_build_object('task_id',p_task_id,'task_title',left(coalesce(v_title,'Untitled task'),160),'source','tasker_support_centre')
  );
  return v_report_id;
end;
$function$;

create or replace function public.submit_tasker_task_report(p_task_id bigint, p_reason text)
returns bigint language sql security invoker
set search_path = pg_catalog, public, private
as $function$ select private.submit_tasker_task_report(p_task_id,p_reason); $function$;

revoke all on function private.poster_cancel_task(bigint,text) from public, anon, authenticated;
revoke all on function private.submit_tasker_task_report(bigint,text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.poster_cancel_task(bigint,text) to authenticated;
grant execute on function private.submit_tasker_task_report(bigint,text) to authenticated;
revoke all on function public.poster_cancel_task(bigint,text) from public, anon;
revoke all on function public.submit_tasker_task_report(bigint,text) from public, anon;
grant execute on function public.poster_cancel_task(bigint,text) to authenticated;
grant execute on function public.submit_tasker_task_report(bigint,text) to authenticated;
