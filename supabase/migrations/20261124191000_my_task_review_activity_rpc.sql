create or replace function public.get_my_task_review_activity()
returns table(
  completion_id bigint,task_id bigint,task_title text,completed_at timestamptz,
  reviewer_role text,reviewed_member_name text,already_reviewed boolean,review_status text
)
language plpgsql security definer set search_path=pg_catalog,public
as $function$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Please sign in.'; end if;
  return query
  select tc.id,tc.task_id,coalesce(t.title,'Task #'||tc.task_id::text),tc.created_at,
    case when tc.user_id=v_uid then 'tasker' else 'poster' end,
    coalesce(p.full_name,'Member'),(r.id is not null),r.status
  from public.task_completions tc
  join public.tasks t on t.id=tc.task_id
  left join public.profiles p on p.id=case when tc.user_id=v_uid then t.created_by else tc.user_id end
  left join public.task_reviews r on r.completion_id=tc.id and r.reviewer_id=v_uid
  where upper(coalesce(tc.status,''))='APPROVED'
    and (tc.user_id=v_uid or t.created_by=v_uid)
  order by tc.created_at desc limit 200;
end;
$function$;
revoke all on function public.get_my_task_review_activity() from public,anon;
grant execute on function public.get_my_task_review_activity() to authenticated;
