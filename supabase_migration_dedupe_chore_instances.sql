-- Run this once in the Supabase SQL editor for the wellome project.
--
-- A race in ChoresPage's auto-assign generator (React StrictMode double-
-- invoking the load effect during dev) let two concurrent runs both decide
-- "no instance yet for this template+day" and both insert one, producing
-- duplicate open chores (e.g. Trash/Dehumidifier appearing twice on the
-- same day). This script removes the extras and adds a unique constraint
-- so it can't happen again -- the app now upserts with
-- onConflict: 'template_id,week_start', ignoreDuplicates: true.

-- 1. Delete duplicate auto-assigned instances, keeping the oldest row per
--    (template_id, week_start). Rows with template_id null (one-time
--    chores, and the template rows themselves) are untouched.
delete from chores a
using chores b
where a.template_id is not null
  and a.template_id = b.template_id
  and a.week_start = b.week_start
  and (a.created_at, a.id) > (b.created_at, b.id);

-- 2. Prevent it from happening again. NULL template_id values are treated
--    as distinct by Postgres, so this only constrains actual instances.
alter table chores
  add constraint chores_template_instance_unique unique (template_id, week_start);
