-- Row-level security. Browser clients use the anon/authenticated key only.
-- Edge Functions use the service role key, which bypasses RLS where required.

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

-- Profiles: authenticated users can discover each other for sharing/collaboration,
-- but only owners and admins may modify sensitive fields.
drop policy if exists profiles_select_directory on public.profiles;
create policy profiles_select_directory on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Plans
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans
  for select to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists plans_admin_write on public.plans;
create policy plans_admin_write on public.plans
  for insert to authenticated with check (public.is_admin());
drop policy if exists plans_admin_update on public.plans;
create policy plans_admin_update on public.plans
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists plans_admin_delete on public.plans;
create policy plans_admin_delete on public.plans
  for delete to authenticated using (public.is_admin());

-- Subscriptions and payments: users can read their own; billing writes are server-side.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own on public.subscriptions
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Conversations and messages
drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own on public.conversations
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists conversations_insert_own on public.conversations;
create policy conversations_insert_own on public.conversations
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists conversations_update_own on public.conversations;
create policy conversations_update_own on public.conversations
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists conversations_delete_own on public.conversations;
create policy conversations_delete_own on public.conversations
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists messages_insert_user on public.messages;
create policy messages_insert_user on public.messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'user'
    and public.is_active_user()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Storage metadata
drop policy if exists folders_own on public.folders;
create policy folders_own on public.folders
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists files_select_access on public.files;
create policy files_select_access on public.files
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

drop policy if exists files_insert_own on public.files;
create policy files_insert_own on public.files
  for insert to authenticated with check (owner_id = auth.uid() and public.is_active_user());

drop policy if exists files_update_own on public.files;
create policy files_update_own on public.files
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists files_delete_own on public.files;
create policy files_delete_own on public.files
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

drop policy if exists file_shares_select on public.file_shares;
create policy file_shares_select on public.file_shares
  for select to authenticated
  using (
    shared_with = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  );

drop policy if exists file_shares_insert_owner on public.file_shares;
create policy file_shares_insert_owner on public.file_shares
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  );

drop policy if exists file_shares_delete_owner on public.file_shares;
create policy file_shares_delete_owner on public.file_shares
  for delete to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.files f where f.id = file_id and f.owner_id = auth.uid())
  );

-- Proposals
drop policy if exists proposals_select_access on public.project_proposals;
create policy proposals_select_access on public.project_proposals
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.project_proposal_shares s
      where s.proposal_id = id and s.shared_with = auth.uid()
    )
  );

drop policy if exists proposals_insert_own on public.project_proposals;
create policy proposals_insert_own on public.project_proposals
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists proposals_update_own on public.project_proposals;
create policy proposals_update_own on public.project_proposals
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists proposals_delete_own on public.project_proposals;
create policy proposals_delete_own on public.project_proposals
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists proposal_shares_select on public.project_proposal_shares;
create policy proposal_shares_select on public.project_proposal_shares
  for select to authenticated
  using (
    shared_with = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.project_proposals p
      where p.id = proposal_id and p.user_id = auth.uid()
    )
  );

drop policy if exists proposal_shares_insert_owner on public.project_proposal_shares;
create policy proposal_shares_insert_owner on public.project_proposal_shares
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.project_proposals p
      where p.id = proposal_id and p.user_id = auth.uid()
    )
  );

drop policy if exists proposal_shares_delete_owner on public.project_proposal_shares;
create policy proposal_shares_delete_owner on public.project_proposal_shares
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.project_proposals p
      where p.id = proposal_id and p.user_id = auth.uid()
    )
  );

-- Marketplace
drop policy if exists service_categories_read on public.service_categories;
create policy service_categories_read on public.service_categories
  for select to anon, authenticated using (true);

drop policy if exists service_categories_admin_write on public.service_categories;
create policy service_categories_admin_write on public.service_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists services_read on public.services;
create policy services_read on public.services
  for select to anon, authenticated
  using (active = true or public.is_admin());

drop policy if exists services_admin_write on public.services;
create policy services_admin_write on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists service_requests_select on public.service_requests;
create policy service_requests_select on public.service_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists service_requests_insert_own on public.service_requests;
create policy service_requests_insert_own on public.service_requests
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists service_requests_admin_update on public.service_requests;
create policy service_requests_admin_update on public.service_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists quotations_select on public.quotations;
create policy quotations_select on public.quotations
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.service_requests r
      where r.id = service_request_id and r.user_id = auth.uid()
    )
  );

drop policy if exists quotations_admin_write on public.quotations;
create policy quotations_admin_write on public.quotations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Connections and blocks
drop policy if exists connections_select_participant on public.connections;
create policy connections_select_participant on public.connections
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());

drop policy if exists connections_insert_requester on public.connections;
create policy connections_insert_requester on public.connections
  for insert to authenticated
  with check (requester_id = auth.uid() and addressee_id <> auth.uid() and public.is_active_user());

drop policy if exists connections_update_participant on public.connections;
create policy connections_update_participant on public.connections
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin())
  with check (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());

drop policy if exists connections_delete_participant on public.connections;
create policy connections_delete_participant on public.connections
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());

drop policy if exists user_blocks_own on public.user_blocks;
create policy user_blocks_own on public.user_blocks
  for all to authenticated
  using (blocker_id = auth.uid() or public.is_admin())
  with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

-- Collaboration threads
drop policy if exists chat_threads_participant on public.chat_threads;
create policy chat_threads_participant on public.chat_threads
  for select to authenticated
  using (public.is_thread_participant(id) or public.is_admin());

drop policy if exists chat_participants_member on public.chat_participants;
create policy chat_participants_member on public.chat_participants
  for select to authenticated
  using (public.is_thread_participant(thread_id) or public.is_admin());

drop policy if exists direct_messages_member on public.direct_messages;
create policy direct_messages_member on public.direct_messages
  for select to authenticated
  using (public.is_thread_participant(thread_id) or public.is_admin());

drop policy if exists direct_messages_send on public.direct_messages;
create policy direct_messages_send on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_active_user()
    and public.is_thread_participant(thread_id)
  );

-- Admin-only AI, knowledge, settings, and auditing
drop policy if exists ai_models_read on public.ai_models;
create policy ai_models_read on public.ai_models
  for select to anon, authenticated
  using (enabled = true or public.is_admin());

drop policy if exists ai_models_admin_write on public.ai_models;
create policy ai_models_admin_write on public.ai_models
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists knowledge_datasets_admin on public.knowledge_datasets;
create policy knowledge_datasets_admin on public.knowledge_datasets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists knowledge_chunks_admin on public.knowledge_chunks;
create policy knowledge_chunks_admin on public.knowledge_chunks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists system_settings_admin on public.system_settings;
create policy system_settings_admin on public.system_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (public.is_admin());

-- contact_messages is written only by the contact-message Edge Function using
-- the service role. No browser policy is intentionally defined.

-- Private storage buckets
drop policy if exists user_files_select on storage.objects;
create policy user_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'user-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_access_file_object(name)
    )
  );

drop policy if exists user_files_insert on storage.objects;
create policy user_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

drop policy if exists user_files_update on storage.objects;
create policy user_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists user_files_delete on storage.objects;
create policy user_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists knowledge_objects_admin on storage.objects;
create policy knowledge_objects_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'knowledge' and public.is_admin())
  with check (bucket_id = 'knowledge' and public.is_admin());
