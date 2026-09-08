-- Run this once in the Supabase SQL editor for the wellome project before
-- deploying the recurring-bills feature. Mirrors the recurring-chores
-- pattern: a bill can be marked is_template=true to act as a monthly
-- template, and BillsPage auto-creates that month's instance (template_id
-- pointing back to it) the first time that month is viewed.

alter table bills
  add column if not exists is_template boolean not null default false,
  add column if not exists template_id uuid references bills(id) on delete set null;

-- Unlike chores, deleting a recurring template must NOT cascade-delete past
-- instances -- those are financial records. "Stop repeating" just deletes
-- the template row; existing months' bills stay, with template_id set null.

-- NULL template_id values are treated as distinct by Postgres, so this only
-- constrains actual generated instances (one per template per month), and
-- lets the app upsert with onConflict/ignoreDuplicates to avoid races.
alter table bills
  add constraint bills_template_instance_unique unique (template_id, month);
