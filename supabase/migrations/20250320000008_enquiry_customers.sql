-- =============================================
-- Enquiry Customers (temporary leads)
-- =============================================

-- 1) Table to store enquiry-specific data
create table if not exists enquiry_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  alternate_phone text,
  address text,
  birth_date date,
  project_id uuid references projects(id) on delete set null,
  category text not null,
  details text,
  is_active boolean default true,
  upgraded_customer_id uuid,
  upgraded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Foreign key after creation
alter table enquiry_customers
  drop constraint if exists fk_enquiry_upgraded_customer;

alter table enquiry_customers
  add constraint fk_enquiry_upgraded_customer
  foreign key (upgraded_customer_id) references customers(id) on delete set null;

create index if not exists idx_enquiry_customers_phone on enquiry_customers(phone);
create index if not exists idx_enquiry_customers_project_id on enquiry_customers(project_id);

alter table enquiry_customers enable row level security;

-- Admin-only access
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'enquiry_customers' and policyname = 'enquiry_admin_all'
  ) then
    create policy enquiry_admin_all
      on enquiry_customers
      for all
      to authenticated
      using (
        coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
      )
      with check (
        coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
      );
  end if;
end $$;

-- 2) Add linking fields to customers
alter table customers
  add column if not exists enquiry_temp_id uuid references enquiry_customers(id) on delete set null,
  add column if not exists upgraded_from_enquiry_id uuid references enquiry_customers(id) on delete set null,
  add column if not exists upgraded_from_enquiry_category text,
  add column if not exists upgraded_from_enquiry_details text,
  add column if not exists upgraded_from_enquiry_at timestamptz;

-- 3) Ensure admin can read/write customers (for enquiry upgrade flow)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_admin_all'
  ) then
    create policy customers_admin_all
      on customers
      for all
      to authenticated
      using (
        coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
      )
      with check (
        coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
      );
  end if;
end $$;

