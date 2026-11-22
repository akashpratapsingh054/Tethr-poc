-- Tethr memory vault. Run once in the Supabase SQL editor.
-- The API uses the secret key, which bypasses RLS. The browser never queries these tables.

create table if not exists public.user_drive_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry_date bigint,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('image', 'text')),
  title text,
  caption text,
  text_content text,
  drive_file_id text,
  drive_file_name text,
  mime_type text,
  original_size_kb numeric,
  compressed_size_kb numeric,
  created_at timestamptz not null default now()
);

create index if not exists user_entries_user_created_idx
  on public.user_entries (user_id, created_at desc);

alter table public.user_drive_tokens enable row level security;
alter table public.user_entries enable row level security;

grant all on table public.user_drive_tokens to service_role;
grant all on table public.user_entries to service_role;
