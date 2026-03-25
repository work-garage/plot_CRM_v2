-- Storage policies for customer docs (bucket: customer-docs)
-- Fix: prevent 22P02 (invalid input syntax for type uuid) by safely casting
-- path segments and auth metadata.

drop policy if exists "customer_docs_advisor_select" on storage.objects;
drop policy if exists "customer_docs_advisor_insert" on storage.objects;
drop policy if exists "customer_docs_advisor_update" on storage.objects;
drop policy if exists "customer_docs_advisor_delete" on storage.objects;

-- Safe UUID regex (case-insensitive)
-- Note: We embed the CASE expression inline so policy evaluation won't error.

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
    where c.id = (
      case
        when split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 2)::uuid
        else null
      end
    )
      and c.advisor_id = (
        case
          when nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          else null
        end
      )
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
    where c.id = (
      case
        when split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 2)::uuid
        else null
      end
    )
      and c.advisor_id = (
        case
          when nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          else null
        end
      )
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
    where c.id = (
      case
        when split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 2)::uuid
        else null
      end
    )
      and c.advisor_id = (
        case
          when nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          else null
        end
      )
  )
)
with check (
  bucket_id = 'customer-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') = 'advisor'
  and exists (
    select 1
    from customers c
    where c.id = (
      case
        when split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 2)::uuid
        else null
      end
    )
      and c.advisor_id = (
        case
          when nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          else null
        end
      )
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
    where c.id = (
      case
        when split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 2)::uuid
        else null
      end
    )
      and c.advisor_id = (
        case
          when nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          else null
        end
      )
  )
);

