-- Server-side authorization, quota enforcement, profile creation, and RPCs.

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

create or replace function public.can_access_file_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.files f
    where f.storage_path = object_name
      and (
        f.owner_id = auth.uid()
        or exists (
          select 1 from public.file_shares s
          where s.file_id = f.id
            and s.shared_with = auth.uid()
            and (s.expires_at is null or s.expires_at > now())
        )
      )
  );
$$;

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
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = coalesce(new.email, email),
      full_name = coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''), full_name),
      avatar_url = coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''), avatar_url),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_user_profile();

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and old.id = auth.uid() and not public.is_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.storage_quota_bytes is distinct from old.storage_quota_bytes
       or lower(new.email) is distinct from lower(old.email) then
      raise exception 'You are not allowed to change protected profile fields.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

create or replace function public.guard_subscription_update()
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
       or new.current_period_end is distinct from old.current_period_end
       or new.created_at is distinct from old.created_at then
      raise exception 'Subscription billing fields can only be changed by the payment service.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_guard_update on public.subscriptions;
create trigger subscriptions_guard_update
  before update on public.subscriptions
  for each row execute function public.guard_subscription_update();

create or replace function public.admin_update_profile(p_user_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_role text;
  v_status text;
  v_quota bigint;
  v_full_name text;
  v_active_admins integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;

  v_role := coalesce(p_patch ->> 'role', v_profile.role);
  v_status := coalesce(p_patch ->> 'status', v_profile.status);
  v_quota := coalesce((p_patch ->> 'storage_quota_bytes')::bigint, v_profile.storage_quota_bytes);
  v_full_name := case
    when p_patch ? 'full_name' then nullif(trim(p_patch ->> 'full_name'), '')
    else v_profile.full_name
  end;

  if v_role not in ('user', 'admin') then
    raise exception 'Invalid role.' using errcode = '22023';
  end if;
  if v_status not in ('active', 'suspended', 'pending') then
    raise exception 'Invalid status.' using errcode = '22023';
  end if;
  if v_quota < 0 then
    raise exception 'Storage quota cannot be negative.' using errcode = '22023';
  end if;

  if p_user_id = auth.uid() and (v_role <> 'admin' or v_status <> 'active') then
    select count(*) into v_active_admins
    from public.profiles
    where role = 'admin' and status = 'active';
    if v_active_admins <= 1 then
      raise exception 'The last active administrator cannot be demoted or suspended.'
        using errcode = '42501';
    end if;
  end if;

  update public.profiles
  set role = v_role,
      status = v_status,
      storage_quota_bytes = v_quota,
      full_name = v_full_name,
      updated_at = now()
  where id = p_user_id;

  if v_status = 'suspended' then
    update auth.users
    set banned_until = now() + interval '100 years'
    where id = p_user_id;
  elsif v_status = 'active' then
    update auth.users
    set banned_until = null
    where id = p_user_id;
  end if;
end;
$$;

create or replace function public.record_audit_event(
  p_event_type text,
  p_severity text default 'info',
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if p_severity not in ('info', 'warning', 'critical') then
    raise exception 'Invalid audit severity.' using errcode = '22023';
  end if;

  select email into v_email from public.profiles where id = v_actor;

  insert into public.audit_logs (actor_id, actor_email, event_type, severity, target_type, target_id, metadata)
  values (v_actor, v_email, p_event_type, p_severity, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.get_or_create_direct_thread(p_other_user uuid)
returns public.chat_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_thread public.chat_threads%rowtype;
begin
  if v_me is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_other_user is null or p_other_user = v_me then
    raise exception 'Choose another user to start a conversation.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user and status = 'active') then
    raise exception 'That account is not available.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_me and blocked_id = p_other_user)
       or (blocker_id = p_other_user and blocked_id = v_me)
  ) then
    raise exception 'A conversation cannot be started because one account has blocked the other.'
      using errcode = '42501';
  end if;

  select t.* into v_thread
  from public.chat_threads t
  join public.chat_participants a on a.thread_id = t.id and a.user_id = v_me
  join public.chat_participants b on b.thread_id = t.id and b.user_id = p_other_user
  where t.is_group = false
    and (select count(*) from public.chat_participants c where c.thread_id = t.id) = 2
  order by t.created_at
  limit 1;

  if found then
    return v_thread;
  end if;

  insert into public.chat_threads (created_by, is_group)
  values (v_me, false)
  returning * into v_thread;

  insert into public.chat_participants (thread_id, user_id)
  values (v_thread.id, v_me), (v_thread.id, p_other_user);

  return v_thread;
end;
$$;

create or replace function public.begin_ai_request(
  p_user_id uuid,
  p_model text,
  p_conversation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
  v_messages integer;
  v_requests integer;
  v_usage_id uuid;
  v_model_enabled boolean;
  v_premium boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select p.* into v_plan
  from public.plans p
  join public.subscriptions s on s.plan_id = p.id
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing', 'past_due')
  order by s.created_at desc
  limit 1;

  if not found then
    select * into v_plan from public.plans where slug = 'free' limit 1;
  end if;

  if not found then
    raise exception 'No plan is configured. Contact an administrator.' using errcode = 'P0002';
  end if;

  if p_model is not null and length(trim(p_model)) > 0 then
    select enabled, is_premium into v_model_enabled, v_premium
    from public.ai_models
    where model_id = p_model;

    if found then
      if not v_model_enabled then
        raise exception 'The selected AI model is disabled.' using errcode = '22023';
      end if;
      if v_premium and not v_plan.premium_models then
        raise exception 'The selected AI model requires a Pro or Business plan.' using errcode = '42501';
      end if;
    end if;
  end if;

  select count(*) into v_messages
  from public.messages
  where user_id = p_user_id
    and role = 'user'
    and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';

  if v_messages >= v_plan.ai_messages_per_day then
    raise exception 'Daily AI message limit reached (% of %). Limits reset at midnight UTC.',
      v_messages, v_plan.ai_messages_per_day
      using errcode = 'P0001';
  end if;

  select count(*) into v_requests
  from public.ai_usage
  where user_id = p_user_id and created_at >= now() - interval '1 minute';

  if v_requests >= v_plan.ai_requests_per_minute then
    raise exception 'Rate limit reached. Wait a moment before sending another AI request.'
      using errcode = 'P0001';
  end if;

  insert into public.ai_usage (user_id, conversation_id, model)
  values (p_user_id, p_conversation_id, coalesce(nullif(trim(p_model), ''), 'default'))
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

create or replace function public.finish_ai_request(
  p_usage_id uuid,
  p_prompt_tokens integer,
  p_completion_tokens integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_usage
  set prompt_tokens = greatest(coalesce(p_prompt_tokens, 0), 0),
      completion_tokens = greatest(coalesce(p_completion_tokens, 0), 0),
      total_tokens = greatest(coalesce(p_prompt_tokens, 0), 0) + greatest(coalesce(p_completion_tokens, 0), 0)
  where id = p_usage_id;

  if not found then
    raise exception 'Usage record not found.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.release_ai_request(p_usage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ai_usage
  where id = p_usage_id and total_tokens = 0;
end;
$$;

create or replace function public.match_knowledge_chunks(
  p_query text,
  p_match_count integer default 5
)
returns table (
  dataset_id uuid,
  dataset_name text,
  content text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(nullif(trim(p_query), ''), 'peaceai')) as ts
  )
  select
    d.id as dataset_id,
    d.name as dataset_name,
    c.content,
    ts_rank_cd(c.search_vector, query.ts)::real as rank
  from public.knowledge_chunks c
  join public.knowledge_datasets d on d.id = c.dataset_id,
       query
  where d.status = 'ready'
    and c.search_vector @@ query.ts
  order by rank desc, c.chunk_index
  limit greatest(least(coalesce(p_match_count, 5), 12), 1);
$$;

revoke all on function public.begin_ai_request(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.finish_ai_request(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.release_ai_request(uuid) from public, anon, authenticated;
revoke all on function public.match_knowledge_chunks(text, integer) from public, anon, authenticated;

grant execute on function public.begin_ai_request(uuid, text, uuid) to service_role;
grant execute on function public.finish_ai_request(uuid, integer, integer) to service_role;
grant execute on function public.release_ai_request(uuid) to service_role;
grant execute on function public.match_knowledge_chunks(text, integer) to service_role;

grant execute on function public.admin_update_profile(uuid, jsonb) to authenticated;
grant execute on function public.record_audit_event(text, text, text, text, jsonb) to authenticated;
grant execute on function public.get_or_create_direct_thread(uuid) to authenticated;
