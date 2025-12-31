-- Run this in Supabase SQL Editor

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_read_own"
on public.subscriptions
for select
using (auth.uid() = user_id);

-- No client inserts or updates. Only the Stripe webhook uses the service role key.
