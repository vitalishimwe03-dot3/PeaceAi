-- PeaceAI initial schema.
-- All application data is scoped to authenticated users through RLS in the next migration.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  storage_quota_bytes bigint not null default 6442450944 check (storage_quota_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_rwf integer not null default 0 check (price_rwf >= 0),
  annual_price_rwf integer check (annual_price_rwf is null or annual_price_rwf >= 0),
  billing_period text not null default 'month' check (billing_period in ('month', 'year')),
  ai_messages_per_day integer not null default 25 check (ai_messages_per_day >= 0),
  ai_requests_per_minute integer not null default 5 check (ai_requests_per_minute >= 0),
  premium_models boolean not null default false,
  storage_bytes bigint not null default 6442450944 check (storage_bytes >= 0),
  proposal_limit_per_month integer not null default 2 check (proposal_limit_per_month >= 0),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists subscriptions_one_active_per_user_idx
  on public.subscriptions (user_id)
  where status in ('active', 'trialing', 'past_due');
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  amount_rwf bigint not null check (amount_rwf >= 0),
  currency text not null default 'RWF',
  provider text not null default 'flutterwave',
  provider_reference text unique,
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'refunded', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New conversation',
  model text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_idx on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  model text,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_user_created_idx on public.messages (user_id, created_at desc);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  model text not null default 'unconfigured',
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  parent_id uuid references public.folders (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists folders_owner_idx on public.folders (owner_id);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_owner_idx on public.files (owner_id, created_at desc);
create index if not exists files_folder_idx on public.files (folder_id);

create table if not exists public.file_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files (id) on delete cascade,
  shared_with uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  permission text not null default 'download' check (permission in ('view', 'download')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (file_id, shared_with)
);

create index if not exists file_shares_shared_with_idx on public.file_shares (shared_with);

create table if not exists public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  summary text not null default '',
  status text not null default 'draft' check (status in ('draft', 'refined', 'shared', 'archived')),
  spec jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_proposals_user_idx on public.project_proposals (user_id, updated_at desc);

create table if not exists public.project_proposal_shares (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.project_proposals (id) on delete cascade,
  shared_with uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (proposal_id, shared_with)
);

create index if not exists proposal_shares_shared_with_idx on public.project_proposal_shares (shared_with);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default ''
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category_id uuid not null references public.service_categories (id) on delete restrict,
  short_description text not null default '',
  description text not null default '',
  requirements text not null default '',
  deliverables jsonb not null default '[]'::jsonb check (jsonb_typeof(deliverables) = 'array'),
  technologies jsonb not null default '[]'::jsonb check (jsonb_typeof(technologies) = 'array'),
  estimated_timeline text not null default '',
  price_from_rwf bigint check (price_from_rwf is null or price_from_rwf >= 0),
  price_to_rwf bigint check (price_to_rwf is null or price_to_rwf >= 0),
  quote_factors jsonb not null default '[]'::jsonb check (jsonb_typeof(quote_factors) = 'array'),
  customer_responsibilities jsonb not null default '[]'::jsonb check (jsonb_typeof(customer_responsibilities) = 'array'),
  terms text not null default '',
  revision_policy text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

create index if not exists services_category_idx on public.services (category_id, sort_order);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  requirements text not null,
  budget_rwf bigint check (budget_rwf is null or budget_rwf >= 0),
  preferred_deadline date,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'quoted', 'approved', 'declined', 'completed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_user_idx on public.service_requests (user_id, created_at desc);
create index if not exists service_requests_status_idx on public.service_requests (status);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests (id) on delete cascade,
  amount_rwf bigint not null check (amount_rwf >= 0),
  currency text not null default 'RWF',
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  terms text not null default '',
  valid_until date,
  created_at timestamptz not null default now()
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists connections_unique_pair_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists connections_requester_idx on public.connections (requester_id);
create index if not exists connections_addressee_idx on public.connections (addressee_id);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index if not exists chat_participants_user_idx on public.chat_participants (user_id);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 10000),
  attachment_file_id uuid references public.files (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists direct_messages_thread_idx on public.direct_messages (thread_id, created_at);

create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'openai',
  model_id text not null unique,
  display_name text not null,
  description text,
  enabled boolean not null default true,
  is_premium boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.knowledge_datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  storage_path text not null unique,
  mime_type text not null default 'text/plain',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'failed')),
  chunk_count integer not null default 0 check (chunk_count >= 0),
  error_message text,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.knowledge_datasets (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer not null default 0,
  search_vector tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now(),
  unique (dataset_id, chunk_index)
);

create index if not exists knowledge_chunks_search_idx on public.knowledge_chunks using gin (search_vector);
create index if not exists knowledge_chunks_dataset_idx on public.knowledge_chunks (dataset_id);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (position('@' in email) > 1),
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 20 and 5000),
  ip_hash text,
  user_agent text,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_ip_idx on public.contact_messages (ip_hash, created_at desc);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists files_updated_at on public.files;
create trigger files_updated_at before update on public.files
  for each row execute function public.set_updated_at();

drop trigger if exists proposals_updated_at on public.project_proposals;
create trigger proposals_updated_at before update on public.project_proposals
  for each row execute function public.set_updated_at();

drop trigger if exists service_requests_updated_at on public.service_requests;
create trigger service_requests_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();

drop trigger if exists datasets_updated_at on public.knowledge_datasets;
create trigger datasets_updated_at before update on public.knowledge_datasets
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('user-files', 'user-files', false, 6442450944),
  ('knowledge', 'knowledge', false, 52428800)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;
