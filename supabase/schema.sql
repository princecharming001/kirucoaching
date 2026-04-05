-- Full schema (same as init_applications.sql). Run in Supabase SQL Editor once.
-- Fresh project with no table: use init_applications.sql or this file.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  over_23 boolean not null,
  fitness_goal text not null,
  heard_about text not null default '',
  first_name text not null,
  last_name text not null,
  email text not null,

  location text not null,
  age text not null,
  occupation text not null,

  commitment_barriers text not null,
  investment_readiness text not null check (investment_readiness in ('A', 'B', 'C')),

  reminder_channel text not null default 'sms' check (reminder_channel in ('sms', 'push')),
  sms_onboarding_skipped boolean not null default false,
  push_subscription jsonb,

  phone text not null default '',
  instagram text not null,
  consent boolean not null default false,

  constraint consent_must_be_true check (consent = true),
  constraint phone_if_sms check (reminder_channel <> 'sms' or length(trim(phone)) > 0)
);

create index if not exists applications_created_at_idx on public.applications (created_at desc);
create index if not exists applications_email_idx on public.applications (email);

alter table public.applications enable row level security;

-- Anonymous inserts from the public site (anon key). Tighten if you add auth later.
create policy "Allow anon insert applications"
  on public.applications
  for insert
  to anon
  with check (true);

-- No SELECT policy for anon: public rows are not readable via the API (insert still works with Prefer: return=minimal).
