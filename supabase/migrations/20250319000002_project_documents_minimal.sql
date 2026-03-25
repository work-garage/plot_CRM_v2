-- Minimal migration: project_documents table only.
-- If the full migration fails due to storage policy permissions, run ONLY this file.
-- Then create bucket "project-docs" and policies via Supabase Dashboard > Storage.

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
