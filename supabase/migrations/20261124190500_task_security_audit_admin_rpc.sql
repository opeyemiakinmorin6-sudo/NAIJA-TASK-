-- Admin-only read endpoint for the append-only task cancellation audit.
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
  order by e.created_at desc limit 500;
end;
$function$;
revoke all on function public.admin_get_task_security_events() from public,anon;
grant execute on function public.admin_get_task_security_events() to authenticated;
