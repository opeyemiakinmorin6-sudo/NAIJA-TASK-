-- Explicit Tasker attempt cancellations are recorded for investigation only.
create table if not exists public.tasker_attempt_cancellations (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check(char_length(btrim(reason)) between 10 and 500),
  created_at timestamptz not null default now(),
  constraint tasker_attempt_cancellations_one_per_task unique(task_id,user_id)
);
create index if not exists tasker_attempt_cancellations_created_idx
on public.tasker_attempt_cancellations(created_at desc);
alter table public.tasker_attempt_cancellations enable row level security;
revoke all on public.tasker_attempt_cancellations from anon,authenticated;
grant select on public.tasker_attempt_cancellations to authenticated;
drop policy if exists "Taskers and admins can read attempt cancellations" on public.tasker_attempt_cancellations;
create policy "Taskers and admins can read attempt cancellations"
on public.tasker_attempt_cancellations for select to authenticated
using (
  user_id=(select auth.uid())
  or exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.active is true)
);

-- A cancelled attempt is terminal for that user/task pair; it cannot be submitted afterward.
create or replace function public.task_is_available_for_user(p_task_id bigint)
returns boolean language sql stable security definer
set search_path=pg_catalog,public
as $function$
  select exists (
    select 1 from public.tasks t
    join public.profiles p on p.id=auth.uid()
    where t.id=p_task_id
      and p.role in ('tasker','user')
      and not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.active is true)
      and t.created_by<>auth.uid()
      and coalesce(t.active,false)=true
      and coalesce(t.reward,0)>0
      and upper(coalesce(t.status,'')) in ('LIVE','ACTIVE','PUBLISHED','APPROVED','OPEN')
      and (t.start_date is null or t.start_date<=now())
      and (t.expiry_date is null or t.expiry_date>now())
      and upper(coalesce(t.moderation_status,'APPROVED')) in ('APPROVED','LIVE','PUBLISHED','OPEN')
      and (
        exists(select 1 from public.admin_users a where a.user_id=t.created_by and a.active is true)
        or (
          upper(coalesce(t.payment_status,'')) in ('PAID','APPROVED','COMPLETED','SUCCESSFUL')
          and coalesce(t.funded_amount,0)>=coalesce(t.total_funding_required,0)
          and exists(select 1 from public.poster_payments pp where pp.task_id=t.id and upper(coalesce(pp.status,'')) in ('APPROVED','PAID','COMPLETED','SUCCESSFUL'))
        )
      )
      and not exists(select 1 from public.task_submissions s where s.task_id=t.id and s.user_id=auth.uid())
      and not exists(select 1 from public.task_completions tc where tc.task_id=t.id and tc.user_id=auth.uid())
      and not exists(select 1 from public.tasker_attempt_cancellations c where c.task_id=t.id and c.user_id=auth.uid())
      and (
        case lower(coalesce(t.task_audience,'normal'))
          when 'activation' then coalesce(p.is_activated,false)=false
          when 'vip' then coalesce(p.is_vip,false)=true or upper(coalesce(to_jsonb(p)->>'vip_status','')) in ('VIP','ACTIVE','APPROVED','ENABLED')
          else true
        end
      )
      and (
        case when exists(select 1 from public.admin_users a where a.user_id=t.created_by and a.active is true)
          then nullif(t.max_total_completions,0) else t.slots end is null
        or (select count(*) from public.task_completions tc where tc.task_id=t.id) <
          case when exists(select 1 from public.admin_users a where a.user_id=t.created_by and a.active is true)
            then nullif(t.max_total_completions,0) else t.slots end
      )
  );
$function$;

create or replace function public.cancel_my_task_attempt(p_task_id bigint,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $function$
declare
  v_uid uuid:=auth.uid();
  v_reason text:=btrim(coalesce(p_reason,''));
  v_task_status text;
  v_id bigint;
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_uid and lower(coalesce(p.role,'')) in ('tasker','user')) then
    raise exception 'Only Tasker accounts can cancel a task attempt.';
  end if;
  if p_task_id is null or p_task_id<1 then raise exception 'Invalid task reference.'; end if;
  if char_length(v_reason)<10 or char_length(v_reason)>500 then
    raise exception 'Please give a short reason between 10 and 500 characters.';
  end if;
  select upper(coalesce(t.status,'')) into v_task_status from public.tasks t where t.id=p_task_id;
  if not found then raise exception 'Task not found.'; end if;
  if v_task_status='CANCELLED' then raise exception 'The Poster has already cancelled this task.'; end if;
  if not exists(select 1 from public.task_activity ta where ta.task_id=p_task_id and ta.user_id=v_uid and upper(ta.activity_type)='STARTED') then
    raise exception 'Open the task before cancelling your attempt.';
  end if;
  if exists(select 1 from public.task_submissions s where s.task_id=p_task_id and s.user_id=v_uid)
     or exists(select 1 from public.task_completions c where c.task_id=p_task_id and c.user_id=v_uid) then
    raise exception 'You have already submitted or completed this task; use Support if something went wrong.';
  end if;
  insert into public.tasker_attempt_cancellations(task_id,user_id,reason)
  values(p_task_id,v_uid,v_reason) returning id into v_id;
  return jsonb_build_object('success',true,'cancellation_id',v_id,'task_id',p_task_id,'automatic_penalty',false);
exception when unique_violation then
  raise exception 'You have already cancelled this task attempt.';
end;
$function$;
revoke all on function public.cancel_my_task_attempt(bigint,text) from public,anon;
grant execute on function public.cancel_my_task_attempt(bigint,text) to authenticated;

create or replace function public.admin_get_task_security_events()
returns table(
  id bigint,task_id bigint,task_title text,poster_name text,event_type text,
  reason text,affected_taskers integer,started_taskers integer,
  submitted_taskers integer,completed_taskers integer,created_at timestamptz
)
language plpgsql security definer set search_path=pg_catalog,public
as $function$
begin
  if auth.uid() is null or not exists(
    select 1 from public.admin_users a where a.user_id=auth.uid() and a.active is true
  ) then raise exception 'Active administrator access required.'; end if;
  return query
  select e.id,e.task_id,coalesce(t.title,'Task #'||e.task_id::text),
    coalesce(p.full_name,'Poster'),e.event_type,e.reason,e.affected_taskers,
    coalesce((e.metadata->>'started_taskers')::integer,0),
    coalesce((e.metadata->>'submitted_taskers')::integer,0),
    coalesce((e.metadata->>'completed_taskers')::integer,0),e.created_at
  from public.task_security_events e
  left join public.tasks t on t.id=e.task_id
  left join public.profiles p on p.id=e.actor_id
  union all
  select c.id,c.task_id,coalesce(t.title,'Task #'||c.task_id::text),
    coalesce(p.full_name,'Tasker'),'TASKER_CANCELLED_ATTEMPT',c.reason,1,1,0,0,c.created_at
  from public.tasker_attempt_cancellations c
  left join public.tasks t on t.id=c.task_id
  left join public.profiles p on p.id=c.user_id
  order by created_at desc limit 500;
end;
$function$;
revoke all on function public.admin_get_task_security_events() from public,anon;
grant execute on function public.admin_get_task_security_events() to authenticated;
