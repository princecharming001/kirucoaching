-- Add referral / attribution field (run once on existing Supabase projects).
alter table public.applications
  add column if not exists heard_about text not null default '';
