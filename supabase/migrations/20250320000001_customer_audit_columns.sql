-- Customer audit fields for admin reporting:
-- - created_by / created_by_email
-- - last_edited_by / last_edited_by_email

alter table customers
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text,
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null,
  add column if not exists last_edited_by_email text;

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

  -- Always stamp last editor.
  new.last_edited_by := auth.uid();

  -- Store email for simple UI rendering.
  new.created_by_email := (
    select u.email from auth.users u where u.id = auth.uid()
  );
  new.last_edited_by_email := (
    select u.email from auth.users u where u.id = auth.uid()
  );

  return new;
end;
$$;

drop trigger if exists trg_customers_audit on customers;

create trigger trg_customers_audit
before insert or update on customers
for each row
execute function set_customer_audit_fields();

