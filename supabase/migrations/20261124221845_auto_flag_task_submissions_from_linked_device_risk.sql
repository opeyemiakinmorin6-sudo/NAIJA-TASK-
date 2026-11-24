create or replace function public.flag_submission_for_linked_device_risk()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_signal_count integer := 0;
  v_signal_types jsonb := '[]'::jsonb;
begin
  select count(*),
         coalesce(jsonb_agg(distinct ds.signal_type), '[]'::jsonb)
    into v_signal_count, v_signal_types
  from private.user_device_signals ds
  where ds.user_id = new.user_id
    and ds.risk_level in ('medium','high')
    and ds.last_seen_at >= now() - interval '30 days';

  if v_signal_count > 0 then
    insert into public.task_submission_review_flags
      (submission_id, task_id, tasker_id, risk_reasons, status, flagged_at)
    values
      (new.id, new.task_id, new.user_id,
       jsonb_build_array('linked_device_or_ip_requires_review') || v_signal_types,
       'pending', now())
    on conflict (submission_id) do update
      set risk_reasons = (
        select coalesce(jsonb_agg(distinct item), '[]'::jsonb)
        from jsonb_array_elements(
          coalesce(public.task_submission_review_flags.risk_reasons, '[]'::jsonb)
          || excluded.risk_reasons
        ) as items(item)
      ),
      status = 'pending',
      flagged_at = now(),
      resolved_by = null,
      resolved_at = null,
      resolution_note = null;
  end if;

  return new;
end;
$function$;

revoke all on function public.flag_submission_for_linked_device_risk() from public, anon, authenticated;

drop trigger if exists trg_flag_submission_for_linked_device_risk on public.task_submissions;
create trigger trg_flag_submission_for_linked_device_risk
after insert on public.task_submissions
for each row
execute function public.flag_submission_for_linked_device_risk();
