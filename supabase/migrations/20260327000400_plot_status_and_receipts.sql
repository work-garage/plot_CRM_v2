-- Normalize persisted plot status from active sales and ensure receipt storage exists.

with latest_active_sales as (
  select
    ps.plot_id,
    ps.sale_phase,
    row_number() over (
      partition by ps.plot_id
      order by ps.created_at desc, ps.id desc
    ) as row_num
  from public.plot_sales ps
  where coalesce(ps.is_cancelled, false) = false
),
resolved_statuses as (
  select
    p.id as plot_id,
    case
      when las.sale_phase = 'token' then 'token'
      when las.sale_phase = 'agreement' then 'agreement'
      when las.sale_phase in ('registry', 'full_payment') then 'sold'
      when p.status in ('token', 'agreement', 'sold') and las.plot_id is null then 'available'
      when p.status in ('available', 'token', 'agreement', 'sold') then p.status
      else 'available'
    end as resolved_status
  from public.plots p
  left join latest_active_sales las
    on las.plot_id = p.id
   and las.row_num = 1
)
update public.plots p
set
  status = rs.resolved_status,
  updated_at = now()
from resolved_statuses rs
where p.id = rs.plot_id
  and coalesce(p.status, 'available') <> rs.resolved_status;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "receipts_authenticated_read" on storage.objects;
drop policy if exists "receipts_authenticated_insert" on storage.objects;
drop policy if exists "receipts_authenticated_update" on storage.objects;
drop policy if exists "receipts_authenticated_delete" on storage.objects;

create policy "receipts_authenticated_read"
on storage.objects for select to authenticated
using (bucket_id = 'receipts');

create policy "receipts_authenticated_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'receipts');

create policy "receipts_authenticated_update"
on storage.objects for update to authenticated
using (bucket_id = 'receipts')
with check (bucket_id = 'receipts');

create policy "receipts_authenticated_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'receipts');
