-- ============================================================
-- LUME VISUALS BOT — tables in the SAME Supabase project as the site.
-- Run this once in the Supabase SQL editor (after supabase/schema.sql).
--
-- These tables are only ever touched by the bot backend using the
-- SERVICE ROLE key (kept secret in bot/.env, never in the browser).
-- RLS is enabled with NO policies, so the site's public anon key
-- (used by the browser) cannot read or write any of this — only the
-- service role, which bypasses RLS entirely, can.
-- ============================================================

create table public.bot_users (
  telegram_id bigint primary key,
  username text,
  first_name text,
  started_at timestamptz not null default now(),
  free_sub_expires_at timestamptz,
  paid_sub_expires_at timestamptz,
  paid_sub_lifetime boolean not null default false,
  license_key text
);

alter table public.bot_users enable row level security;

create table public.free_task_submissions (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.bot_users(telegram_id) on delete cascade,
  category text not null check (category in ('review', 'video')),
  photo_file_ids text[] not null default '{}',
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  granted_days integer,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.free_task_submissions enable row level security;

create table public.bot_orders (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.bot_users(telegram_id) on delete cascade,
  duration text not null check (duration in ('30d', '90d', 'lifetime')),
  price_usd numeric(10, 2) not null,
  payment_method text not null check (payment_method in ('ton', 'usdt_erc20', 'usdc_erc20', 'stars', 'manual')),
  amount_crypto numeric(20, 8),
  amount_unit text,
  tx_hash text,
  telegram_charge_id text,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'submitted', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.bot_orders enable row level security;
