-- Project documents table + storage policies
-- NOTE: Do NOT run ALTER on storage.objects - causes "must be owner of table objects".
-- If this script fails (e.g. on storage.buckets or storage.objects), run instead:
--   20250319000002_project_documents_minimal.sql
-- Then create bucket "project-docs" and storage policies via Supabase Dashboard > Storage.
-- Running without transaction so project_documents is created even if storage steps fail.

-- 1) Create project_documents table (we own public schema)
create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  doc_category text not null,
  doc_type text not null,
  file_path text not null,
  file_name text,
  mime_type text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_project_documents_project on project_documents(project_id);

alter table project_documents enable row level security;

drop policy if exists "project_documents_admin_all" on project_documents;

create policy "project_documents_admin_all"
on project_documents
for all
to authenticated
using (
  coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') <> 'advisor'
)
with check (
  coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') <> 'advisor'
);

-- 2) Storage bucket (skip if you get permission error - create manually in Dashboard)
insert into storage.buckets (id, name, public)
values ('project-docs', 'project-docs', false)
on conflict (id) do update set public = false;

-- 3) Storage policies on storage.objects (no ALTER - we don't own that table)
drop policy if exists "project_docs_admin_read" on storage.objects;
drop policy if exists "project_docs_admin_write" on storage.objects;
drop policy if exists "project_docs_admin_update" on storage.objects;
drop policy if exists "project_docs_admin_delete" on storage.objects;

create policy "project_docs_admin_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') <> 'advisor'
);

create policy "project_docs_admin_write"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') <> 'advisor'
);

create policy "project_docs_admin_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'project-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') <> 'advisor'
)
with check (
  bucket_id = 'project-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') <> 'advisor'
);

create policy "project_docs_admin_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-docs'
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'admin') <> 'advisor'
);
