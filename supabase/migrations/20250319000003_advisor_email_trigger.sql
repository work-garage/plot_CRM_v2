-- Ensure advisors.email is always populated (needed for phone+password login)

-- Backfill existing advisors
update advisors
set email = format(
  'adv_%s@mginfra.local',
  right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)
)
where
  (email is null or btrim(email) = '')
  and phone is not null
  and regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> '';

-- Auto-generate email on insert/update when blank
create or replace function set_advisor_email_from_phone()
returns trigger
language plpgsql
as $$
declare
  sanitized_phone text;
begin
  if new.email is null or btrim(new.email) = '' then
    sanitized_phone := right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10);
    if sanitized_phone is not null and sanitized_phone <> '' then
      new.email := format('adv_%s@mginfra.local', sanitized_phone);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advisors_email on advisors;

create trigger trg_advisors_email
before insert or update on advisors
for each row
execute function set_advisor_email_from_phone();

