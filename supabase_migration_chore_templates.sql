-- Run this once in the Supabase SQL editor for the wellome project before
-- deploying the auto-assign/recurring chores feature. Adds the columns
-- ChoresPage.tsx now queries (is_template, frequency_days, template_id,
-- is_active); existing rows default to plain one-time chores.

alter table chores
  add column if not exists frequency_days int not null default 0,
  add column if not exists is_template boolean not null default false,
  add column if not exists template_id uuid references chores(id) on delete cascade,
  add column if not exists is_active boolean not null default true;
