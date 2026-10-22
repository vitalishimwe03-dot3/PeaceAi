-- Row-level security and ownership rules for PeaceAI.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_thread_participant(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_participants
    where thread_id = p_thread_id and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.file_shares enable row level security;
alter table public.project_proposals enable row level security;
alter table public.project_proposal_shares enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;
alter table public.quotations enable row level security;
alter table public.connections enable row level security;
alter table public.user_blocks enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.direct_messages enable row level security;
alter table public.ai_models enable row level security;
alter table public.knowledge_datasets enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contact_messages enable row level security;

-- Profiles
drop policy if exists "profiles_select_directory" on public.profiles;
create policy "profiles_select_directory" on public.profiles
  for select to authenticated
  using (public.is_active_user() or id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.email is distinct from old.email
      or new.storage_quota_bytes is distinct from old.storage_quota_bytes then
      raise exception 'Only administrators may change role, status, email, or storage quota.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = coalesce(new.email, email) where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.sync_user_email();

-- Plans and billing
drop policy if exists "plans_public_active" on public.plans;
create policy "plans_public_active" on public.plans
  for select to anon, authenticated using (active = true);

drop policy if exists "plans_admin_all" on public.plans;
create policy "plans_admin_all" on public.plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "subscriptions_update_own_cancel" on public.subscriptions;
create policy "subscriptions_update_own_cancel" on public.subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.protect_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.user_id is distinct from old.user_id
      or new.plan_id is distinct from old.plan_id
      or new.status is distinct from old.status
      or new.current_period_start is distinct from old.current_period_start
      or new.current_period_end is distinct from old.current_period_end then
      raise exception 'Only the payment webhook may change subscription status or periods.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_protect_fields on public.subscriptions;
create trigger subscriptions_protect_fields before update on public.subscriptions
  for each row execute function public.protect_subscription_fields();

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Conversations, messages, usage
drop policy if exists "conversations_owner" on public.conversations;
create policy "conversations_owner" on public.conversations
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Storage metadata
drop policy if exists "folders_owner" on public.folders;
create policy "folders_owner" on public.folders
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() and public.is_active_user());

drop policy if exists "files_select_owner_or_shared" on public.files;
create policy "files_select_owner_or_shared" on public.files
  for select to authenticated
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.file_shares s
      where s.file_id = id
        and s.shared_with = auth.uid()
        and (s.expires_at is null or s.expires_at > now())
    )
  );

drop policy if exists "files_insert_owner" on public.files;
create policy "files_insert_owner" on public.files
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_active_user());

drop policy if exists "files_update_owner" on public.files;
create policy "files_update_owner" on public.files
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "files_delete_owner" on public.files;
create policy "files_delete_owner" on public.files
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "file_shares_select_related" on public.file_shares;
create policy "file_shares_select_related" on public.file_shares
  for select to authenticated
  using (
    shared_with = auth.uid()
    or created_by = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  );

drop policy if exists "file_shares_insert_owner" on public.file_shares;
create policy "file_shares_insert_owner" on public.file_shares
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  );

drop policy if exists "file_shares_delete_owner" on public.file_shares;
create policy "file_shares_delete_owner" on public.file_shares
  for delete to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  );

-- Proposals
drop policy if exists "proposals_select_owner_or_shared" on public.project_proposals;
create policy "proposals_select_owner_or_shared" on public.project_proposals
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.project_proposal_shares s
      where s.proposal_id = id and s.shared_with = auth.uid()
    )
  );

drop policy if exists "proposals_insert_owner" on public.project_proposals;
create policy "proposals_insert_owner" on public.project_proposals
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "proposals_update_owner" on public.project_proposals;
create policy "proposals_update_owner" on public.project_proposals
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "proposals_delete_owner" on public.project_proposals;
create policy "proposals_delete_owner" on public.project_proposals
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "proposal_shares_select_related" on public.project_proposal_shares;
create policy "proposal_shares_select_related" on public.project_proposal_shares
  for select to authenticated
  using (
    shared_with = auth.uid()
    or created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.project_proposals p
      where p.id = proposal_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "proposal_shares_insert_owner" on public.project_proposal_shares;
create policy "proposal_shares_insert_owner" on public.project_proposal_shares
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.project_proposals p
      where p.id = proposal_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "proposal_shares_delete_owner" on public.project_proposal_shares;
create policy "proposal_shares_delete_owner" on public.project_proposal_shares
  for delete to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.project_proposals p
      where p.id = proposal_id and p.user_id = auth.uid()
    )
  );

-- Services
drop policy if exists "service_categories_public" on public.service_categories;
create policy "service_categories_public" on public.service_categories
  for select to anon, authenticated using (true);

drop policy if exists "service_categories_admin" on public.service_categories;
create policy "service_categories_admin" on public.service_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "services_public_active" on public.services;
create policy "services_public_active" on public.services
  for select to anon, authenticated using (active = true);

drop policy if exists "services_admin_all" on public.services;
create policy "services_admin_all" on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "service_requests_select_own" on public.service_requests;
create policy "service_requests_select_own" on public.service_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "service_requests_insert_own" on public.service_requests;
create policy "service_requests_insert_own" on public.service_requests
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "service_requests_admin_update" on public.service_requests;
create policy "service_requests_admin_update" on public.service_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "quotations_select_related" on public.quotations;
create policy "quotations_select_related" on public.quotations
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.service_requests r
      where r.id = service_request_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "quotations_admin_all" on public.quotations;
create policy "quotations_admin_all" on public.quotations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Collaboration
drop policy if exists "connections_select_participant" on public.connections;
create policy "connections_select_participant" on public.connections
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());

drop policy if exists "connections_insert_requester" on public.connections;
create policy "connections_insert_requester" on public.connections
  for insert to authenticated
  with check (requester_id = auth.uid() and public.is_active_user());

drop policy if exists "connections_update_participant" on public.connections;
create policy "connections_update_participant" on public.connections
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

create or replace function public.protect_connection_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.requester_id is distinct from old.requester_id
      or new.addressee_id is distinct from old.addressee_id then
      raise exception 'Connection participants cannot be changed.';
    end if;
    if auth.uid() = old.requester_id and new.status is distinct from old.status then
      raise exception 'Only the recipient may respond to a connection request.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists connections_protect_fields on public.connections;
create trigger connections_protect_fields before update on public.connections
  for each row execute function public.protect_connection_fields();

drop policy if exists "user_blocks_owner" on public.user_blocks;
create policy "user_blocks_owner" on public.user_blocks
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists "chat_threads_select_participant" on public.chat_threads;
create policy "chat_threads_select_participant" on public.chat_threads
  for select to authenticated
  using (public.is_thread_participant(id) or public.is_admin());

drop policy if exists "chat_participants_select_participant" on public.chat_participants;
create policy "chat_participants_select_participant" on public.chat_participants
  for select to authenticated
  using (public.is_thread_participant(thread_id) or public.is_admin());

drop policy if exists "direct_messages_select_participant" on public.direct_messages;
create policy "direct_messages_select_participant" on public.direct_messages
  for select to authenticated
  using (public.is_thread_participant(thread_id) or public.is_admin());

drop policy if exists "direct_messages_insert_participant" on public.direct_messages;
create policy "direct_messages_insert_participant" on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_active_user()
    and public.is_thread_participant(thread_id)
    and not exists (
      select 1
      from public.chat_participants cp
      join public.user_blocks b on b.blocked_id = cp.user_id
      where cp.thread_id = direct_messages.thread_id
        and cp.user_id <> auth.uid()
        and b.blocker_id = cp.user_id
    )
  );

-- AI and knowledge
drop policy if exists "ai_models_public_enabled" on public.ai_models;
create policy "ai_models_public_enabled" on public.ai_models
  for select to anon, authenticated using (enabled = true);

drop policy if exists "ai_models_admin_all" on public.ai_models;
create policy "ai_models_admin_all" on public.ai_models
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "knowledge_admin_all" on public.knowledge_datasets;
create policy "knowledge_admin_all" on public.knowledge_datasets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "knowledge_chunks_admin_select" on public.knowledge_chunks;
create policy "knowledge_chunks_admin_select" on public.knowledge_chunks
  for select to authenticated using (public.is_admin());

drop policy if exists "settings_admin_all" on public.system_settings;
create policy "settings_admin_all" on public.system_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audit_admin_select" on public.audit_logs;
create policy "audit_admin_select" on public.audit_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "contact_admin_select" on public.contact_messages;
create policy "contact_admin_select" on public.contact_messages
  for select to authenticated using (public.is_admin());

-- Storage policies. Objects are private and paths are scoped by user id.
drop policy if exists "user_files_read" on storage.objects;
create policy "user_files_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'user-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.files f
        join public.file_shares s on s.file_id = f.id
        where f.storage_path = name
          and s.shared_with = auth.uid()
          and (s.expires_at is null or s.expires_at > now())
      )
    )
  );

drop policy if exists "user_files_insert" on storage.objects;
create policy "user_files_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_files_update" on storage.objects;
create policy "user_files_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_files_delete" on storage.objects;
create policy "user_files_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'user-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "knowledge_objects_admin" on storage.objects;
create policy "knowledge_objects_admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'knowledge' and public.is_admin())
  with check (bucket_id = 'knowledge' and public.is_admin());
