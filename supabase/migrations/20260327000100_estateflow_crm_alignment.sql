-- EstateFlow CRM runtime alignment
-- Adds columns already expected by the app and backfills lifecycle metadata.

alter table public.plot_sales
  add column if not exists sold_by_admin boolean not null default false,
  add column if not exists followup_date date;

alter table public.advisor_commission_payments
  add column if not exists extra_paid_amount numeric(12,2) not null default 0;

alter table public.advisor_project_commissions
  add column if not exists commission_rate numeric(12,2);

update public.advisor_project_commissions
set commission_rate = coalesce(
  commission_rate,
  commission_full_payment,
  commission_registry,
  commission_agreement,
  commission_token,
  0
)
where commission_rate is null;

alter table public.customers
  add column if not exists won_at timestamptz,
  add column if not exists lost_at timestamptz;

alter table public.reminders
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

update public.customers
set won_at = coalesce(won_at, updated_at, created_at)
where lead_status = '🎉 Closed Won'
  and won_at is null;

update public.customers
set lost_at = coalesce(lost_at, updated_at, created_at)
where lead_status = '❌ Closed Lost'
  and lost_at is null;

update public.advisors
set email = format(
  'adv_%s@estateflowcrm.local',
  right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)
)
where
  (email is null or btrim(email) = '' or email ilike '%@mginfra.local')
  and phone is not null
  and regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> '';

create or replace function public.set_advisor_email_from_phone()
returns trigger
language plpgsql
as $$
declare
  sanitized_phone text;
begin
  if new.email is null
    or btrim(new.email) = ''
    or new.email ilike '%@mginfra.local'
  then
    sanitized_phone := right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10);
    if sanitized_phone is not null and sanitized_phone <> '' then
      new.email := format('adv_%s@estateflowcrm.local', sanitized_phone);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advisors_email on public.advisors;

create trigger trg_advisors_email
before insert or update on public.advisors
for each row
execute function public.set_advisor_email_from_phone();

create index if not exists idx_customers_won_at on public.customers (won_at);
create index if not exists idx_customers_lost_at on public.customers (lost_at);
create index if not exists idx_reminders_project_id on public.reminders (project_id);
create index if not exists idx_reminders_created_by on public.reminders (created_by);
