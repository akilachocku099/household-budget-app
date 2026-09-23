-- Run this once in the Supabase SQL Editor.
-- Then enable Anonymous Sign-Ins in Authentication > Sign In / Providers.

create table if not exists public.household_budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.household_budgets enable row level security;

create policy "Users can read their own budget"
on public.household_budgets
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own budget"
on public.household_budgets
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own budget"
on public.household_budgets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own budget"
on public.household_budgets
for delete
to authenticated
using (auth.uid() = user_id);
