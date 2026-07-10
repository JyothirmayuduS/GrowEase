-- GrowEasy AI Importer schema + RLS
-- Apply via: supabase db push | Dashboard SQL | supabase migration up

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  company_name text,
  role text default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- import_jobs
-- ---------------------------------------------------------------------------
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (
    source_type in ('manual_upload', 'google_drive', 'outlook_attachment', 'onedrive')
  ),
  filename text,
  original_filename text,
  file_size bigint,
  total_rows integer not null default 0,
  processed_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  failed_rows integer not null default 0,
  average_confidence numeric,
  current_step text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'uploaded' check (
    status in (
      'uploaded',
      'previewed',
      'processing',
      'mapping',
      'validating',
      'importing',
      'completed',
      'partially_completed',
      'failed',
      'cancelled'
    )
  ),
  processing_time_ms integer,
  error_message text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists import_jobs_user_id_idx on public.import_jobs (user_id);
create index if not exists import_jobs_status_idx on public.import_jobs (status);
create index if not exists import_jobs_created_at_idx on public.import_jobs (created_at desc);

-- ---------------------------------------------------------------------------
-- crm_leads
-- ---------------------------------------------------------------------------
create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  import_job_id uuid references public.import_jobs (id) on delete set null,
  created_at_source text,
  name text,
  email text,
  country_code text,
  mobile_without_country_code text,
  company text,
  city text,
  state text,
  country text,
  lead_owner text,
  crm_status text,
  crm_note text,
  data_source text,
  possession_time text,
  description text,
  confidence numeric,
  original_record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_leads_user_id_idx on public.crm_leads (user_id);
create index if not exists crm_leads_import_job_id_idx on public.crm_leads (import_job_id);
create index if not exists crm_leads_email_idx on public.crm_leads (user_id, email);

-- ---------------------------------------------------------------------------
-- skipped_records
-- ---------------------------------------------------------------------------
create table if not exists public.skipped_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  import_job_id uuid not null references public.import_jobs (id) on delete cascade,
  row_number integer,
  original_record jsonb not null default '{}'::jsonb,
  skip_reason text,
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists skipped_records_job_idx on public.skipped_records (import_job_id);

-- ---------------------------------------------------------------------------
-- field_mappings
-- ---------------------------------------------------------------------------
create table if not exists public.field_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  import_job_id uuid not null references public.import_jobs (id) on delete cascade,
  source_column text not null,
  target_field text,
  confidence numeric,
  status text,
  ai_reason text,
  user_overridden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists field_mappings_job_idx on public.field_mappings (import_job_id);

-- ---------------------------------------------------------------------------
-- import_batches
-- ---------------------------------------------------------------------------
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs (id) on delete cascade,
  batch_number integer not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'failed')
  ),
  attempt_count integer not null default 0,
  input_rows integer not null default 0,
  output_rows integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  unique (import_job_id, batch_number)
);

create index if not exists import_batches_job_idx on public.import_batches (import_job_id);

-- ---------------------------------------------------------------------------
-- integrations
-- ---------------------------------------------------------------------------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (
    provider in ('google_drive', 'microsoft_outlook', 'onedrive')
  ),
  status text not null default 'disconnected' check (
    status in ('connected', 'disconnected', 'error', 'expired')
  ),
  account_email text,
  provider_account_id text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expiry timestamptz,
  scopes jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists integrations_user_provider_idx on public.integrations (user_id, provider);

-- ---------------------------------------------------------------------------
-- oauth_states
-- ---------------------------------------------------------------------------
create table if not exists public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  state_hash text not null unique,
  code_verifier text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_states_hash_idx on public.oauth_states (state_hash);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_idx on public.audit_logs (user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists integrations_updated_at on public.integrations;
create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

drop trigger if exists field_mappings_updated_at on public.field_mappings;
create trigger field_mappings_updated_at
  before update on public.field_mappings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.import_jobs enable row level security;
alter table public.crm_leads enable row level security;
alter table public.skipped_records enable row level security;
alter table public.field_mappings enable row level security;
alter table public.import_batches enable row level security;
alter table public.integrations enable row level security;
alter table public.oauth_states enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- import_jobs
drop policy if exists "import_jobs_select_own" on public.import_jobs;
create policy "import_jobs_select_own" on public.import_jobs
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "import_jobs_insert_own" on public.import_jobs;
create policy "import_jobs_insert_own" on public.import_jobs
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "import_jobs_update_own" on public.import_jobs;
create policy "import_jobs_update_own" on public.import_jobs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "import_jobs_delete_own" on public.import_jobs;
create policy "import_jobs_delete_own" on public.import_jobs
  for delete to authenticated using (auth.uid() = user_id);

-- crm_leads
drop policy if exists "crm_leads_select_own" on public.crm_leads;
create policy "crm_leads_select_own" on public.crm_leads
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "crm_leads_insert_own" on public.crm_leads;
create policy "crm_leads_insert_own" on public.crm_leads
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "crm_leads_update_own" on public.crm_leads;
create policy "crm_leads_update_own" on public.crm_leads
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_leads_delete_own" on public.crm_leads;
create policy "crm_leads_delete_own" on public.crm_leads
  for delete to authenticated using (auth.uid() = user_id);

-- skipped_records
drop policy if exists "skipped_records_select_own" on public.skipped_records;
create policy "skipped_records_select_own" on public.skipped_records
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "skipped_records_insert_own" on public.skipped_records;
create policy "skipped_records_insert_own" on public.skipped_records
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "skipped_records_delete_own" on public.skipped_records;
create policy "skipped_records_delete_own" on public.skipped_records
  for delete to authenticated using (auth.uid() = user_id);

-- field_mappings
drop policy if exists "field_mappings_select_own" on public.field_mappings;
create policy "field_mappings_select_own" on public.field_mappings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "field_mappings_insert_own" on public.field_mappings;
create policy "field_mappings_insert_own" on public.field_mappings
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "field_mappings_update_own" on public.field_mappings;
create policy "field_mappings_update_own" on public.field_mappings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "field_mappings_delete_own" on public.field_mappings;
create policy "field_mappings_delete_own" on public.field_mappings
  for delete to authenticated using (auth.uid() = user_id);

-- import_batches (via job ownership)
drop policy if exists "import_batches_select_own" on public.import_batches;
create policy "import_batches_select_own" on public.import_batches
  for select to authenticated using (
    exists (
      select 1 from public.import_jobs j
      where j.id = import_batches.import_job_id and j.user_id = auth.uid()
    )
  );

-- integrations
drop policy if exists "integrations_select_own" on public.integrations;
create policy "integrations_select_own" on public.integrations
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "integrations_insert_own" on public.integrations;
create policy "integrations_insert_own" on public.integrations
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "integrations_update_own" on public.integrations;
create policy "integrations_update_own" on public.integrations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "integrations_delete_own" on public.integrations;
create policy "integrations_delete_own" on public.integrations
  for delete to authenticated using (auth.uid() = user_id);

-- oauth_states
drop policy if exists "oauth_states_select_own" on public.oauth_states;
create policy "oauth_states_select_own" on public.oauth_states
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "oauth_states_insert_own" on public.oauth_states;
create policy "oauth_states_insert_own" on public.oauth_states
  for insert to authenticated with check (auth.uid() = user_id);

-- audit_logs
drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own" on public.audit_logs
  for select to authenticated using (auth.uid() = user_id);

-- service_role bypasses RLS by default in Supabase
grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated, service_role;
