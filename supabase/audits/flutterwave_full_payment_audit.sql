-- NAIJA TASK: read-only full payment-system audit.
-- Run in Supabase SQL Editor and share the single JSON result.
-- This query does not read secret values or modify data/schema.

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
      ),
      'rls_enabled', coalesce((
        select cls.relrowsecurity
        from pg_class cls
        join pg_namespace ns on ns.oid=cls.relnamespace
        where ns.nspname='public' and cls.relname=t.table_name
      ), false)
    ) order by t.table_name), '[]'::jsonb)
    from information_schema.tables t
    where t.table_schema='public'
      and t.table_type='BASE TABLE'
      and t.table_name in (
        'poster_payments',
        'tasks',
        'marketplace',
        'marketplace_orders',
        'marketplace_products',
        'platform_ads',
        'ad_campaign_payments',
        'profiles',
        'platform_settings',
        'payment_settings',
        'withdrawals',
        'wallet_transactions',
        'deposits'
      )
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table_name', p.tablename,
      'policy_name', p.policyname,
      'command', p.cmd,
      'roles', p.roles,
      'using', p.qual,
      'with_check', p.with_check
    ) order by p.tablename,p.policyname), '[]'::jsonb)
    from pg_policies p
    where p.schemaname='public'
      and p.tablename in (
        'poster_payments','tasks','marketplace','marketplace_orders',
        'marketplace_products','platform_ads','ad_campaign_payments',
        'profiles','platform_settings','withdrawals','wallet_transactions','deposits'
      )
  ),
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'returns', pg_get_function_result(p.oid),
      'security_definer', p.prosecdef
    ) order by p.proname), '[]'::jsonb)
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and (
        p.proname ilike '%payment%'
        or p.proname ilike '%flutterwave%'
        or p.proname ilike '%marketplace%'
        or p.proname ilike '%ad_campaign%'
        or p.proname ilike '%withdraw%'
        or p.proname ilike '%wallet%'
        or p.proname in ('create_poster_task','get_poster_task_payment_amount')
      )
  ),
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table_name', event_object_table,
      'trigger_name', trigger_name,
      'event_manipulation', event_manipulation,
      'action_timing', action_timing,
      'action_statement', action_statement
    ) order by event_object_table,trigger_name), '[]'::jsonb)
    from information_schema.triggers
    where trigger_schema='public'
      and event_object_table in (
        'poster_payments','tasks','marketplace_orders','platform_ads',
        'ad_campaign_payments','profiles','withdrawals','wallet_transactions'
      )
  )
)) as flutterwave_payment_audit_report;
