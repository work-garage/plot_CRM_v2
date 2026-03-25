-- Storage policies for customer docs (bucket: customer-docs)
-- Goal: allow advisors to upload/view docs only for their own customers,
-- while admins can access all customer docs.
--
-- Bucket folder structure used by the app:
--   customers/<customer_id>/<category>/<docType>/<filename>

-- 1) Ensure bucket exists (create in Dashboard if this fails)
insert into storage.buckets (id, name, public)
values ('customer-docs', 'customer-docs', false)
on conflict (id) do update set public = false;

-- 2) Drop existing policies (safe if they don't exist)
drop policy if exists "customer_docs_admin_all_select" on storage.objects;
drop policy if exists "customer_docs_admin_all_insert" on storage.objects;
drop policy if exists "customer_docs_admin_all_update" on storage.objects;
drop policy if exists "customer_docs_admin_all_delete" on storage.objects;

drop policy if exists "customer_docs_advisor_select" on storage.objects;
drop policy if exists "customer_docs_advisor_insert" on storage.objects;
drop policy if exists "customer_docs_advisor_update" on storage.objects;
drop policy if exists "customer_docs_advisor_delete" on storage.objects;

-- 3) Admin policies (full access)
create policy "customer_docs_admin_all_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
);

create policy "customer_docs_admin_all_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
);

create policy "customer_docs_admin_all_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
)
with check (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
);

create policy "customer_docs_admin_all_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'admin'
);

-- 4) Advisor policies (ownership by customer_id in path)
-- Extract customer_id from name: customers/<customer_id>/...
create policy "customer_docs_advisor_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'advisor'
  and exists (
    select 1
    from customers c
    where c.id = split_part(name, '/', 2)::uuid
      and c.advisor_id = nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
  )
);

create policy "customer_docs_advisor_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'advisor'
  and exists (
    select 1
    from customers c
    where c.id = split_part(name, '/', 2)::uuid
      and c.advisor_id = nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
  )
);

create policy "customer_docs_advisor_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'advisor'
  and exists (
    select 1
    from customers c
    where c.id = split_part(name, '/', 2)::uuid
      and c.advisor_id = nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
  )
)
with check (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'advisor'
  and exists (
    select 1
    from customers c
    where c.id = split_part(name, '/', 2)::uuid
      and c.advisor_id = nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
  )
);

create policy "customer_docs_advisor_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'advisor'
  and exists (
    select 1
    from customers c
    where c.id = split_part(name, '/', 2)::uuid
      and c.advisor_id = nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
  )
);

