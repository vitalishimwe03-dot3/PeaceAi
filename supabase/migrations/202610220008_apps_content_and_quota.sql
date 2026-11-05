-- Plan-based storage allowances, owner administrator allocation, app delivery
-- records with post-payment credential release, and editable marketing content.

-- Profiles now inherit the storage allowance of their active plan. A quota of 0
-- means "inherit"; administrators may still set an explicit override.
alter table public.profiles
  alter column storage_quota_bytes set default 0;

update public.profiles
set storage_quota_bytes = case
  when role = 'admin' then greatest(storage_quota_bytes, 53687091200)
  else 0
end;

-- Differentiated plan storage: Free 2 GiB, Pro 15 GiB, Business 50 GiB.
update public.plans set storage_bytes = 2147483648 where slug = 'free';
update public.plans set storage_bytes = 16106127360 where slug = 'pro';
update public.plans set storage_bytes = 53687091200 where slug = 'business';

update public.plans
set features = '["25 AI messages per day","Basic code assistance","Selected AI tools","Basic collaboration","2 GiB private cloud storage","App delivery after payment (1 active build)","Standard response priority"]'::jsonb
where slug = 'free';

update public.plans
set features = '["250 AI messages per day","Advanced coding assistance","Expanded project planning","File sharing and collaboration","15 GiB included storage","Credentialed app delivery after payment","Premium model access where configured","Higher processing priority"]'::jsonb
where slug = 'pro';

update public.plans
set features = '["1,200 AI messages per day","Enhanced collaboration","Team-oriented features","Advanced project workflows","50 GiB included per eligible user","Priority app delivery and credential handover","Priority support"]'::jsonb
where slug = 'business';

create table if not exists public.app_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  project_name text not null,
  description text not null default '',
  status text not null default 'requested'
    check (status in ('requested', 'building', 'ready', 'delivered', 'live')),
  price_rwf integer not null default 0 check (price_rwf >= 0),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded')),
  credentials jsonb not null default '{}'::jsonb,
  credentials_released boolean not null default false,
  admin_notes text,
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists app_deliveries_user_idx
  on public.app_deliveries (user_id, requested_at desc);
create index if not exists app_deliveries_status_idx
  on public.app_deliveries (status, requested_at desc);

drop trigger if exists app_deliveries_updated_at on public.app_deliveries;
create trigger app_deliveries_updated_at before update on public.app_deliveries
  for each row execute function public.set_updated_at();

create table if not exists public.content_blocks (
  key text primary key,
  label text not null,
  section text not null default 'general',
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

drop trigger if exists content_blocks_updated_at on public.content_blocks;
create trigger content_blocks_updated_at before update on public.content_blocks
  for each row execute function public.set_updated_at();

alter table public.app_deliveries enable row level security;
alter table public.content_blocks enable row level security;

drop policy if exists app_deliveries_select on public.app_deliveries;
create policy app_deliveries_select on public.app_deliveries
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists app_deliveries_insert on public.app_deliveries;
create policy app_deliveries_insert on public.app_deliveries
  for insert with check (
    user_id = auth.uid()
    and payment_status = 'unpaid'
    and credentials_released = false
  );

drop policy if exists app_deliveries_admin_write on public.app_deliveries;
create policy app_deliveries_admin_write on public.app_deliveries
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists content_blocks_select on public.content_blocks;
create policy content_blocks_select on public.content_blocks
  for select to anon, authenticated using (true);

drop policy if exists content_blocks_admin_write on public.content_blocks;
create policy content_blocks_admin_write on public.content_blocks
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.content_blocks (key, label, section, value)
values
  (
    'home.hero.title',
    'Home hero title',
    'home',
    'Secure AI, software, and storage for people who take their ideas seriously.'
  ),
  (
    'home.hero.subtitle',
    'Home hero subtitle',
    'home',
    'PeaceAI brings guarded AI conversations, real software delivery, defensive security, private storage, and collaboration together in one calm workspace.'
  ),
  (
    'footer.tagline',
    'Footer tagline',
    'global',
    'Secure AI conversations, software development, defensive cybersecurity, private storage, and collaboration in one thoughtful platform.'
  )
on conflict (key) do nothing;
