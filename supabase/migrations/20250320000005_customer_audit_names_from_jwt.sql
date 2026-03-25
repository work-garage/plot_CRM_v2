-- Populate created_by_name / last_edited_by_name using JWT metadata.
-- UI will show name when available, otherwise fallback to email.

alter table customers
  add column if not exists created_by_name text,
  add column if not exists last_edited_by_name text;

create or replace function set_customer_audit_fields()
returns trigger
language plpgsql
as $$
declare
  meta_name text;
begin
  -- If there is no logged-in user, don't stamp anything.
  if auth.uid() is null then
    return new;
  end if;

  -- common name extraction from JWT user_metadata (keys may vary)
  meta_name := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'fullName', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'username', '')
  );

  -- On insert: set created_by if missing.
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;

  -- created_by timestamps + email/name
  if tg_op = 'INSERT' then
    if new.created_by_at is null then
      new.created_by_at := now();
    end if;

    new.created_by_email := (auth.jwt() ->> 'email');
    if new.created_by_name is null or new.created_by_name = '' then
      new.created_by_name := meta_name;
    end if;
  end if;

  -- Always stamp last editor
  new.last_edited_by := auth.uid();
  new.last_edited_by_at := now();

  new.last_edited_by_email := (auth.jwt() ->> 'email');
  new.last_edited_by_name := meta_name;

  return new;
end;
$$;

drop trigger if exists trg_customers_audit on customers;

create trigger trg_customers_audit
before insert or update on customers
for each row
execute function set_customer_audit_fields();

-- Backfill for rows that still don't have names (best-effort):
-- This can be re-run anytime; it won't overwrite non-null names.
update customers c
set
  created_by_name = coalesce(c.created_by_name, u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name'),
  last_edited_by_name = coalesce(c.last_edited_by_name, u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name')
from auth.users u
where (c.created_by is not null and u.id = c.created_by and (c.created_by_name is null or c.created_by_name = ''))
   or (c.last_edited_by is not null and u.id = c.last_edited_by and (c.last_edited_by_name is null or c.last_edited_by_name = ''));

