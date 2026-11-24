-- NAIJA TASK: task activity hardening, cancellation audit, and verified task reviews.
-- Applied to the production database on 2026-11-24. Keep this migration in source control.

-- Restrict task activity to genuine task starts and prevent duplicate starts.
drop policy if exists "Users can record their own task activity" on public.task_activity;
create policy "Taskers can record eligible task starts"
on public.task_activity for insert to authenticated
with check (
  user_id = (select auth.uid())
  and upper(btrim(coalesce(activity_type,''))) = 'STARTED'
  and public.task_is_available_for_user(task_id)
);
create unique index if not exists task_activity_one_started_per_user_task
on public.task_activity(task_id,user_id)
where upper(activity_type) = 'STARTED';

-- Append-only security audit for Poster task cancellations.
create table if not exists public.task_security_events (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('POSTER_CANCELLED_TASK')),
  reason text,
  affected_taskers integer not null default 0 check (affected_taskers >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint task_security_events_task_event_unique unique(task_id,event_type)
);
create index if not exists task_security_events_created_at_idx
on public.task_security_events(created_at desc);
alter table public.task_security_events enable row level security;
revoke all on public.task_security_events from anon, authenticated;
grant select on public.task_security_events to authenticated;
drop policy if exists "Active admins read task security events" on public.task_security_events;
create policy "Active admins read task security events"
on public.task_security_events for select to authenticated
using (exists (
  select 1 from public.admin_users a
  where a.user_id=(select auth.uid()) and a.active is true
));

create or replace function public.audit_poster_task_cancellation()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_affected integer := 0;
  v_started integer := 0;
  v_submitted integer := 0;
  v_completed integer := 0;
begin
  if upper(coalesce(old.status,''))='CANCELLED'
     or upper(coalesce(new.status,''))<>'CANCELLED' then return new; end if;
  select count(distinct u.user_id)::integer into v_affected
  from (
    select ta.user_id from public.task_activity ta
    where ta.task_id=new.id and upper(coalesce(ta.activity_type,''))='STARTED'
    union select ts.user_id from public.task_submissions ts where ts.task_id=new.id
    union select tc.user_id from public.task_completions tc where tc.task_id=new.id
  ) u
  where u.user_id is not null and u.user_id<>new.created_by;
  select count(distinct ta.user_id)::integer into v_started
  from public.task_activity ta where ta.task_id=new.id and upper(coalesce(ta.activity_type,''))='STARTED';
  select count(distinct ts.user_id)::integer into v_submitted
  from public.task_submissions ts where ts.task_id=new.id;
  select count(distinct tc.user_id)::integer into v_completed
  from public.task_completions tc where tc.task_id=new.id;
  insert into public.task_security_events(task_id,actor_id,event_type,reason,affected_taskers,metadata)
  values (
    new.id,coalesce(new.cancelled_by,auth.uid()),'POSTER_CANCELLED_TASK',
    left(coalesce(new.cancellation_reason,''),500),greatest(v_affected,0),
    jsonb_build_object(
      'task_title',left(coalesce(new.title,'Untitled task'),160),
      'started_taskers',v_started,'submitted_taskers',v_submitted,
      'completed_taskers',v_completed,'refund_automatically_issued',false,
      'source','tasks_status_transition'
    )
  ) on conflict(task_id,event_type) do nothing;
  return new;
end;
$function$;
revoke all on function public.audit_poster_task_cancellation() from public,anon,authenticated;
drop trigger if exists trg_audit_poster_task_cancellation on public.tasks;
create trigger trg_audit_poster_task_cancellation
after update of status on public.tasks
for each row when (old.status is distinct from new.status)
execute function public.audit_poster_task_cancellation();

-- Verified, task-linked two-way reviews. Reviews are created only by the RPC below.
create table if not exists public.task_reviews (
  id uuid primary key default gen_random_uuid(),
  completion_id bigint not null references public.task_completions(id) on delete restrict,
  task_id bigint not null references public.tasks(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  reviewed_user_id uuid not null references auth.users(id) on delete restrict,
  reviewer_role text not null check (reviewer_role in ('tasker','poster')),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(btrim(review_text)) between 20 and 600),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  moderated_by uuid references auth.users(id),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint task_reviews_no_self_review check (reviewer_id<>reviewed_user_id),
  constraint task_reviews_one_per_reviewer_completion unique(completion_id,reviewer_id)
);
create index if not exists task_reviews_reviewed_user_status_idx
on public.task_reviews(reviewed_user_id,status,created_at desc);
create index if not exists task_reviews_task_id_idx
on public.task_reviews(task_id,created_at desc);
alter table public.task_reviews enable row level security;
revoke all on public.task_reviews from anon,authenticated;
grant select (reviewed_user_id,reviewer_role,rating,review_text,status,created_at)
on public.task_reviews to anon,authenticated;
grant update(status,admin_note,moderated_by,moderated_at)
on public.task_reviews to authenticated;

drop policy if exists "Public can read approved task reviews" on public.task_reviews;
create policy "Public can read approved task reviews"
on public.task_reviews for select to anon,authenticated using(status='approved');
drop policy if exists "Review authors can read their own task reviews" on public.task_reviews;
create policy "Review authors can read their own task reviews"
on public.task_reviews for select to authenticated using(reviewer_id=(select auth.uid()));
drop policy if exists "Active admins can moderate task reviews" on public.task_reviews;
create policy "Active admins can moderate task reviews"
on public.task_reviews for update to authenticated
using(exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.active is true))
with check(exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.active is true));
drop policy if exists "Active admins can read all task reviews" on public.task_reviews;
create policy "Active admins can read all task reviews"
on public.task_reviews for select to authenticated
using(exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.active is true));

create or replace function public.submit_verified_task_review(
  p_completion_id bigint,p_rating smallint,p_review_text text
) returns uuid language plpgsql security definer
set search_path = pg_catalog,public
as $function$
declare
  v_uid uuid:=auth.uid();
  v_task_id bigint;
  v_tasker_id uuid;
  v_poster_id uuid;
  v_reviewed_user_id uuid;
  v_reviewer_role text;
  v_review_id uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'Please sign in to leave a review.'; end if;
  if p_completion_id is null or p_completion_id<1 then raise exception 'Invalid completed task reference.'; end if;
  if p_rating is null or p_rating<1 or p_rating>5 then raise exception 'Rating must be from 1 to 5.'; end if;
  if char_length(btrim(coalesce(p_review_text,'')))<20 or char_length(btrim(coalesce(p_review_text,'')))>600 then
    raise exception 'Review must contain 20 to 600 characters.';
  end if;
  select tc.task_id,tc.user_id,tc.status,t.created_by
  into v_task_id,v_tasker_id,v_status,v_poster_id
  from public.task_completions tc join public.tasks t on t.id=tc.task_id
  where tc.id=p_completion_id;
  if not found or upper(coalesce(v_status,''))<>'APPROVED' then
    raise exception 'Only a genuinely approved task completion can be reviewed.';
  end if;
  if v_uid=v_tasker_id then
    v_reviewed_user_id:=v_poster_id; v_reviewer_role:='tasker';
  elsif v_uid=v_poster_id then
    v_reviewed_user_id:=v_tasker_id; v_reviewer_role:='poster';
  else
    raise exception 'You were not a participant in this completed task.';
  end if;
  if v_reviewed_user_id is null or v_reviewed_user_id=v_uid then
    raise exception 'This task does not have an eligible review recipient.';
  end if;
  insert into public.task_reviews(
    completion_id,task_id,reviewer_id,reviewed_user_id,reviewer_role,rating,review_text
  ) values (
    p_completion_id,v_task_id,v_uid,v_reviewed_user_id,v_reviewer_role,p_rating,btrim(p_review_text)
  ) returning id into v_review_id;
  return v_review_id;
exception when unique_violation then
  raise exception 'You have already reviewed this completed task.';
end;
$function$;
revoke all on function public.submit_verified_task_review(bigint,smallint,text) from public,anon;
grant execute on function public.submit_verified_task_review(bigint,smallint,text) to authenticated;

create or replace function public.admin_get_task_reviews()
returns table(
  id uuid,task_id bigint,task_title text,reviewer_name text,reviewed_name text,
  reviewer_role text,rating smallint,review_text text,status text,created_at timestamptz
)
language plpgsql security definer set search_path=pg_catalog,public
as $function$
begin
  if auth.uid() is null or not exists(
    select 1 from public.admin_users a where a.user_id=auth.uid() and a.active is true
  ) then raise exception 'Active administrator access required.'; end if;
  return query
  select r.id,r.task_id,coalesce(t.title,'Task #'||r.task_id::text),
    coalesce(pr.full_name,'Member'),coalesce(pv.full_name,'Member'),
    r.reviewer_role,r.rating,r.review_text,r.status,r.created_at
  from public.task_reviews r
  left join public.tasks t on t.id=r.task_id
  left join public.profiles pr on pr.id=r.reviewer_id
  left join public.profiles pv on pv.id=r.reviewed_user_id
  order by case when r.status='pending' then 0 else 1 end,r.created_at desc limit 500;
end;
$function$;
create or replace function public.admin_moderate_task_review(
  p_review_id uuid,p_status text,p_note text default null
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $function$
declare v_rows integer:=0;
begin
  if auth.uid() is null or not exists(
    select 1 from public.admin_users a where a.user_id=auth.uid() and a.active is true
  ) then raise exception 'Active administrator access required.'; end if;
  if p_review_id is null or lower(coalesce(p_status,'')) not in ('approved','rejected') then
    raise exception 'Invalid review moderation request.';
  end if;
  if char_length(coalesce(p_note,''))>1000 then raise exception 'Admin note is too long.'; end if;
  update public.task_reviews set status=lower(p_status),
    admin_note=nullif(btrim(coalesce(p_note,'')),''),
    moderated_by=auth.uid(),moderated_at=now()
  where id=p_review_id;
  get diagnostics v_rows=row_count;
  if v_rows=0 then raise exception 'Review not found.'; end if;
  return jsonb_build_object('success',true,'status',lower(p_status));
end;
$function$;
revoke all on function public.admin_get_task_reviews() from public,anon;
revoke all on function public.admin_moderate_task_review(uuid,text,text) from public,anon;
grant execute on function public.admin_get_task_reviews() to authenticated;
grant execute on function public.admin_moderate_task_review(uuid,text,text) to authenticated;
