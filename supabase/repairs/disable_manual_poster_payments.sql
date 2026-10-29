-- NAIJA TASK: disable legacy manual poster payment RPCs.
-- This preserves old rows for audit/history but prevents new manual proof submissions
-- and manual-payment approvals through Supabase RPC. New poster payments must use Flutterwave.
-- Run once in Supabase SQL Editor after reviewing the current project schema.

do $$
begin
  if to_regprocedure('public.submit_poster_payment(bigint,numeric,text,text,text)') is not null then
    execute 'revoke execute on function public.submit_poster_payment(bigint,numeric,text,text,text) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.admin_approve_manual_poster_payment(bigint)') is not null then
    execute 'revoke execute on function public.admin_approve_manual_poster_payment(bigint) from public, anon, authenticated';
  end if;
end
$$;

-- Read-only verification: both functions should show no execute privilege for anon/authenticated.
select
  p.oid::regprocedure as function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('submit_poster_payment', 'admin_approve_manual_poster_payment')
order by p.proname;
