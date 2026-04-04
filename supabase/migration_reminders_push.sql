-- Run in Supabase SQL Editor ONLY if `public.applications` already exists (older schema).
-- If you see: relation "public.applications" does not exist → run init_applications.sql first.
-- Adds reminder channel, SMS skip flag, Web Push subscription (Apple/Safari use standard Web Push).

alter table public.applications
  add column if not exists reminder_channel text not null default 'sms',
  add column if not exists sms_onboarding_skipped boolean not null default false,
  add column if not exists push_subscription jsonb;

alter table public.applications drop constraint if exists applications_reminder_channel_check;
alter table public.applications
  add constraint applications_reminder_channel_check
  check (reminder_channel in ('sms', 'push'));

-- Allow empty phone when using push-only reminders
alter table public.applications alter column phone drop not null;
update public.applications set phone = coalesce(nullif(trim(phone), ''), '') where phone is null;
alter table public.applications alter column phone set default '';
alter table public.applications alter column phone set not null;

alter table public.applications drop constraint if exists applications_phone_if_sms;
alter table public.applications
  add constraint applications_phone_if_sms
  check (reminder_channel <> 'sms' or length(trim(phone)) > 0);
