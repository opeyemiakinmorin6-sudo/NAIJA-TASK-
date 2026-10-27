-- NAIJA TASK Platform Ads backend audit (READ ONLY)
-- Run this in Supabase SQL Editor and share the single JSON result.
-- This script does not create, update, or delete database objects or data.

select jsonb_pretty(jsonb_build_object(
  'checked_at', now(),
  'tables', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table_name', t.table_name,
      'columns', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', c.column_name,
          'type', c.data_type,
          'udt_name', c.udt_name,
          'nullable', c.is_nullable,
          'default', c.column_default
        ) order by c.ordinal_position), '[]'::jsonb)
        from information_schema.columns c
        where c.table_schema='public' and c.table_name=t.table_name
      )
    ) order by t.table_name), '[]'::jsonb)
    from information_schema.tables t
    where t.table_schema='public'
      and t.table_type='BASE TABLE'
      and t.table_name in (
        'platform_ads',
        'ad_campaign_payments',
        'ad_events',
        'platform_revenue',
        'platform_settings',
        'advertisement_payments',
        'posters',
        'admin_users'
      )
  ),
  'rls_policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table_name', p.tablename,
      'policy_name', p.policyname,
      'command', p.cmd,
      'roles', p.roles,
      'using', p.qual,
      'with_check', p.with_check
    ) order by p.tablename, p.policyname), '[]'::jsonb)
    from pg_policies p
    where p.schemaname='public'
      and p.tablename in (
        'platform_ads',
        'ad_campaign_payments',
        'ad_events',
        'platform_revenue',
        'platform_settings',
        'advertisement_payments',
        'posters'
      )
  ),
  'relevant_functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'returns', pg_get_function_result(p.oid),
      'security_definer', p.prosecdef
    ) order by p.proname), '[]'::jsonb)
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in (
        'record_ad_event',
        'get_poster_task_payment_amount',
        'set_updated_at'
      )
  )
)) as platform_ads_audit_report;
