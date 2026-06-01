-- Run this in your Supabase SQL editor to set up the database.

create table houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  max_members int not null default 6,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

create table house_members (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  display_name text not null,
  joined_at timestamptz default now(),
  unique(house_id, user_id)
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete cascade not null,
  name text not null,
  month text not null, -- YYYY-MM
  total_amount numeric(10,2) not null,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

create table bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  amount numeric(10,2) not null,
  paid boolean default false,
  paid_at timestamptz
);

create table house_rules (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete cascade not null,
  text text not null,
  proposed_by uuid references auth.users not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  votes_approve uuid[] default '{}',
  votes_reject uuid[] default '{}',
  created_at timestamptz default now()
);

create table chores (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete cascade not null,
  name text not null,
  duration_minutes int not null default 30,
  chore_type text not null default 'individual' check (chore_type in ('individual', 'group', 'recurring')),
  week_start date not null,
  assigned_to uuid references auth.users,
  completed boolean default false,
  completed_at timestamptz,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table houses enable row level security;
alter table house_members enable row level security;
alter table bills enable row level security;
alter table bill_payments enable row level security;
alter table house_rules enable row level security;
alter table chores enable row level security;

-- Houses: members can read their own house
create policy "members can view their house"
  on houses for select
  using (id in (select house_id from house_members where user_id = auth.uid()));

create policy "authenticated can create house"
  on houses for insert
  with check (auth.uid() = created_by);

-- House members: members can view members in same house
create policy "members can view housemates"
  on house_members for select
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "authenticated can join house"
  on house_members for insert
  with check (auth.uid() = user_id);

-- Bills: house members can manage
create policy "members can view bills"
  on bills for select
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can insert bills"
  on bills for insert
  with check (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can delete bills"
  on bills for delete
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

-- Bill payments
create policy "members can view payments"
  on bill_payments for select
  using (bill_id in (select id from bills where house_id in (select house_id from house_members where user_id = auth.uid())));

create policy "members can insert payments"
  on bill_payments for insert
  with check (bill_id in (select id from bills where house_id in (select house_id from house_members where user_id = auth.uid())));

create policy "members can update own payment"
  on bill_payments for update
  using (user_id = auth.uid());

create policy "members can delete payments"
  on bill_payments for delete
  using (bill_id in (select id from bills where house_id in (select house_id from house_members where user_id = auth.uid())));

-- House rules
create policy "members can view rules"
  on house_rules for select
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can propose rules"
  on house_rules for insert
  with check (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can vote on rules"
  on house_rules for update
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can delete rules"
  on house_rules for delete
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

-- Chores
create policy "members can view chores"
  on chores for select
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can insert chores"
  on chores for insert
  with check (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can update chores"
  on chores for update
  using (house_id in (select house_id from house_members where user_id = auth.uid()));

create policy "members can delete chores"
  on chores for delete
  using (house_id in (select house_id from house_members where user_id = auth.uid()));
