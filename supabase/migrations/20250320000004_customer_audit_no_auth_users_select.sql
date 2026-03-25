-- Fix: avoid permission errors by NOT selecting from auth.users inside the trigger.
-- Use JWT claims (auth.jwt() ->> 'email') instead.

-- Ensure audit columns exist (including timestamps used by UI)
alter table customers
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text,
  add column if not exists created_by_at timestamptz,
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null,
  add column if not exists last_edited_by_email text,
  add column if not exists last_edited_by_at timestamptz;

create or replace function set_customer_audit_fields()
returns trigger
language plpgsql
as $$
begin
  -- If there is no logged-in user, don't stamp anything.
  if auth.uid() is null then
    return new;
  end if;

  -- On insert: set created_by if missing.
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;

  -- Timestamps
  if tg_op = 'INSERT' then
    if new.created_by_at is null then
      new.created_by_at := now();
    end if;
  end if;

  -- Always stamp last editor.
  new.last_edited_by := auth.uid();
  new.last_edited_by_at := now();

  -- Email for UI (from JWT claims, no auth.users lookup)
  new.created_by_email := (auth.jwt() ->> 'email');
  new.last_edited_by_email := (auth.jwt() ->> 'email');

  return new;
end;
$$;

drop trigger if exists trg_customers_audit on customers;

create trigger trg_customers_audit
before insert or update on customers
for each row
execute function set_customer_audit_fields();

