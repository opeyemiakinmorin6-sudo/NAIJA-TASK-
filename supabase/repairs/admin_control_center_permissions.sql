-- NAIJA TASK Admin Control Center permission repair
-- Applied to Supabase project jwakveeiynpakunwjzkj on 2026-11-20.
-- Keep the public settings view as the public read interface. The underlying
-- platform_settings table is readable only by active admins through RLS.
-- Ad campaign events remain private to active admins; service-role event
-- collection is unaffected.

begin;

drop policy if exists "Authenticated users can view platform settings"
  on public.platform_settings;
grant select on table public.platform_settings to authenticated;

drop policy if exists "Active admins can view ad campaign events"
  on public.ad_campaign_events;
create policy "Active admins can view ad campaign events"
  on public.ad_campaign_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users as a
      where a.user_id = (select auth.uid())
        and a.active is true
    )
  );
grant select on table public.ad_campaign_events to authenticated;

commit;
