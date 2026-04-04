-- Run once if `applications` exists but has no fitness_goal column (apply form sends this field).

alter table public.applications
  add column if not exists fitness_goal text not null default '';

update public.applications set fitness_goal = '' where fitness_goal is null;
