-- NAIJA TASK: supporting records required by flutterwave-payments/index.ts
-- The Edge Function uses the service-role key for these records. Keep RLS enabled
-- and do not add client INSERT/UPDATE policies for either table.

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('activation', 'vip')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  tx_ref text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'successful', 'verified', 'failed', 'cancelled', 'refunded')),
  flw_transaction_id text unique,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists membership_payments_user_purpose_created_idx
  on public.membership_payments (user_id, purpose, created_at desc);

create table if not exists public.flutterwave_transaction_ledger (
  transaction_id text primary key,
  payment_table text not null
    check (payment_table in (
      'membership_payments',
      'poster_payments',
      'marketplace_orders',
      'ad_campaign_payments'
    )),
  payment_record_id text not null,
  tx_ref text not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  created_at timestamptz not null default now(),
  constraint flutterwave_ledger_one_transaction_per_payment
    unique (payment_table, payment_record_id)
);

create unique index if not exists flutterwave_ledger_tx_ref_unique
  on public.flutterwave_transaction_ledger (tx_ref);

create index if not exists flutterwave_ledger_user_created_idx
  on public.flutterwave_transaction_ledger (user_id, created_at desc);

alter table public.membership_payments enable row level security;
alter table public.flutterwave_transaction_ledger enable row level security;

-- These tables are written only by the trusted Edge Function.
revoke all on table public.membership_payments from anon, authenticated;
revoke all on table public.flutterwave_transaction_ledger from anon, authenticated;
grant all on table public.membership_payments to service_role;
grant all on table public.flutterwave_transaction_ledger to service_role;
