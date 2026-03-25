-- Improve customer audit display:
-- If JWT doesn't contain a "name" claim, derive it from advisors.name using advisors.auth_user_id.

alter table customers
  add column if not exists created_by_name text,
  add column if not exists last_edited_by_name text;

create or replace function set_customer_audit_fields()
returns trigger
language plpgsql
as $$
declare
  meta_name text;
  advisor_name text;
  role_claim text;
begin
  -- If there is no logged-in user, don't stamp anything.
  if auth.uid() is null then
    return new;
  end if;

  role_claim := coalesce(auth.jwt() -> 'user_metadata' ->> 'role', auth.jwt() ->> 'role');

  -- Best-effort name from JWT metadata
  meta_name := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'fullName', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'username', '')
  );

  -- Advisor name fallback (no auth.users table access needed)
  select a.name into advisor_name
  from advisors a
  where a.auth_user_id = auth.uid()
  limit 1;

  -- On insert: set created_by if missing
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;

  if tg_op = 'INSERT' then
    if new.created_by_at is null then
      new.created_by_at := now();
    end if;
    new.created_by_email := (auth.jwt() ->> 'email');

    -- Prefer JWT name, else advisor name; keep NULL if neither exists.
    if new.created_by_name is null or new.created_by_name = '' then
      new.created_by_name := coalesce(meta_name, advisor_name);
    end if;
  end if;

  -- Always stamp last editor + time
  new.last_edited_by := auth.uid();
  new.last_edited_by_at := now();
  new.last_edited_by_email := (auth.jwt() ->> 'email');

  if new.last_edited_by_name is null or new.last_edited_by_name = '' then
    new.last_edited_by_name := coalesce(meta_name, advisor_name);
  end if;

  return new;
end;
$$;

-- Re-create trigger (safe even if it already exists)
drop trigger if exists trg_customers_audit on customers;
create trigger trg_customers_audit
before insert or update on customers
for each row
execute function set_customer_audit_fields();

-- Backfill existing blank names from advisors.auth_user_id
update customers c
set
  created_by_name = a.name,
  created_by_email = coalesce(c.created_by_email, (select auth.jwt() ->> 'email'))
from advisors a
where
  (c.created_by_name is null or c.created_by_name = '')
  and c.created_by is not null
  and a.auth_user_id = c.created_by;

update customers c
set
  last_edited_by_name = a.name,
  last_edited_by_email = coalesce(c.last_edited_by_email, (select auth.jwt() ->> 'email'))
from advisors a
where
  (c.last_edited_by_name is null or c.last_edited_by_name = '')
  and c.last_edited_by is not null
  and a.auth_user_id = c.last_edited_by;

