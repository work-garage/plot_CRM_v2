-- Fix for failed backfill due to auth.users having no user_metadata column.
-- Keep trigger JWT-based (no auth.users selects) and default existing names.

alter table customers
  add column if not exists created_by_name text,
  add column if not exists last_edited_by_name text,
  add column if not exists created_by_at timestamptz,
  add column if not exists last_edited_by_at timestamptz,
  add column if not exists created_by_email text,
  add column if not exists last_edited_by_email text;

create or replace function set_customer_audit_fields()
returns trigger
language plpgsql
as $$
declare
  meta_name text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;

  -- created_by_at
  if tg_op = 'INSERT' and new.created_by_at is null then
    new.created_by_at := now();
  end if;

  -- last editor always
  new.last_edited_by := auth.uid();
  new.last_edited_by_at := now();

  new.created_by_email := (auth.jwt() ->> 'email');
  new.last_edited_by_email := (auth.jwt() ->> 'email');

  meta_name := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'fullName', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'username', '')
  );

  if tg_op = 'INSERT' then
    if new.created_by_name is null or new.created_by_name = '' then
      new.created_by_name := meta_name;
    end if;
  end if;

  -- Always set last edited name (fallback to whatever meta_name is)
  if meta_name is not null and meta_name <> '' then
    new.last_edited_by_name := meta_name;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_customers_audit on customers;
create trigger trg_customers_audit
before insert or update on customers
for each row
execute function set_customer_audit_fields();

-- Best-effort: ensure existing records don't display blank names.
update customers
set
  created_by_name = case
    when created_by_name is null or created_by_name = '' then created_by_email
    else created_by_name
  end,
  last_edited_by_name = case
    when last_edited_by_name is null or last_edited_by_name = '' then last_edited_by_email
    else last_edited_by_name
  end
where
  (created_by_name is null or created_by_name = '')
  or (last_edited_by_name is null or last_edited_by_name = '');

