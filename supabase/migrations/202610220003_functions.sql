-- Server-side RPCs used by the application and Edge Functions.

create or replace function public.admin_update_profile(p_user_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.profiles;
  v_role text;
  v_status text;
  v_quota bigint;
  v_admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'A profile patch object is required.';
  end if;

  select * into v_current from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found.';
  end if;

  v_role := coalesce(p_patch ->> 'role', v_current.role);
  v_status := coalesce(p_patch ->> 'status', v_current.status);
  v_quota := coalesce((p_patch ->> 'storage_quota_bytes')::bigint, v_current.storage_quota_bytes);

  if v_role not in ('user', 'admin') then
    raise exception 'Invalid role.';
  end if;
  if v_status not in ('active', 'suspended', 'pending') then
    raise exception 'Invalid status.';
  end if;
  if v_quota < 0 then
    raise exception 'Storage quota cannot be negative.';
  end if;

  if v_current.role = 'admin' and v_current.status = 'active'
    and (v_role <> 'admin' or v_status <> 'active') then
    select count(*) into v_admin_count
    from public.profiles
    where role = 'admin' and status = 'active';
    if v_admin_count <= 1 then
      raise exception 'The last active administrator cannot be demoted or suspended.';
    end if;
  end if;

  update public.profiles
  set full_name = case when p_patch ? 'full_name' then nullif(p_patch ->> 'full_name', '') else full_name end,
      role = v_role,
      status = v_status,
      storage_quota_bytes = v_quota,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_update_profile(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_profile(uuid, jsonb) to authenticated;

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
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if p_severity not in ('info', 'warning', 'critical') then
    raise exception 'Invalid audit severity.';
  end if;
  select email into v_email from public.profiles where id = v_actor;
  insert into public.audit_logs (actor_id, actor_email, event_type, severity, target_type, target_id, metadata)
  values (v_actor, v_email, p_event_type, p_severity, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.record_audit_event(text, text, text, text, jsonb) from public, anon;
grant execute on function public.record_audit_event(text, text, text, text, jsonb) to authenticated;

create or replace function public.get_or_create_direct_thread(p_other_user uuid)
returns public.chat_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_thread public.chat_threads;
begin
  if v_me is null then
    raise exception 'Authentication is required.';
  end if;
  if p_other_user is null or p_other_user = v_me then
    raise exception 'Choose another PeaceAI user.';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_other_user and status = 'active'
  ) then
    raise exception 'That account is not available for messaging.';
  end if;
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_me and blocked_id = p_other_user)
       or (blocker_id = p_other_user and blocked_id = v_me)
  ) then
    raise exception 'Messaging is unavailable because one of you has blocked the other.';
  end if;

  select t.* into v_thread
  from public.chat_threads t
  where t.is_group = false
    and exists (select 1 from public.chat_participants a where a.thread_id = t.id and a.user_id = v_me)
    and exists (select 1 from public.chat_participants b where b.thread_id = t.id and b.user_id = p_other_user)
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

revoke all on function public.get_or_create_direct_thread(uuid) from public, anon;
grant execute on function public.get_or_create_direct_thread(uuid) to authenticated;

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
  v_plan public.plans;
  v_profile public.profiles;
  v_model text := nullif(trim(p_model), '');
  v_usage_id uuid;
  v_messages_today integer;
  v_requests_minute integer;
  v_premium boolean := false;
  v_reset_at timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc' + interval '1 day';
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found or v_profile.status <> 'active' then
    raise exception 'This account is not active.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select p.* into v_plan
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing', 'past_due')
    and (s.current_period_end is null or s.current_period_end > now())
  order by s.created_at desc
  limit 1;

  if not found then
    select * into v_plan from public.plans where slug = 'free' and active = true;
  end if;
  if not found then
    raise exception 'No active plan is configured.';
  end if;

  select count(*) into v_messages_today
  from public.messages
  where user_id = p_user_id
    and role = 'user'
    and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';

  if v_messages_today >= v_plan.ai_messages_per_day then
    raise exception 'Daily AI message limit reached for the % plan. Upgrade or try again after %.',
      v_plan.name, v_reset_at;
  end if;

  select count(*) into v_requests_minute
  from public.ai_usage
  where user_id = p_user_id and created_at >= now() - interval '1 minute';

  if v_requests_minute >= v_plan.ai_requests_per_minute then
    raise exception 'AI request rate limit reached. Please wait a minute and try again.';
  end if;

  if v_model is not null then
    select is_premium into v_premium from public.ai_models where model_id = v_model and enabled = true;
    if coalesce(v_premium, false) and not v_plan.premium_models then
      raise exception 'The selected model requires a Pro or Business plan.';
    end if;
  end if;

  if p_conversation_id is not null and not exists (
    select 1 from public.conversations where id = p_conversation_id and user_id = p_user_id
  ) then
    raise exception 'Conversation not found.';
  end if;

  insert into public.ai_usage (user_id, conversation_id, model, prompt_tokens, completion_tokens, total_tokens)
  values (p_user_id, p_conversation_id, coalesce(v_model, 'unconfigured'), 0, 0, 0)
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

revoke all on function public.begin_ai_request(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.begin_ai_request(uuid, text, uuid) to service_role;

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
    raise exception 'AI usage record not found.';
  end if;
end;
$$;

revoke all on function public.finish_ai_request(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.finish_ai_request(uuid, integer, integer) to service_role;

create or replace function public.match_knowledge_chunks(p_query text, p_limit integer default 5)
returns table (
  chunk_id uuid,
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
  select c.id, c.dataset_id, d.name, c.content,
         ts_rank_cd(c.search_vector, plainto_tsquery('english', p_query)) as rank
  from public.knowledge_chunks c
  join public.knowledge_datasets d on d.id = c.dataset_id
  where d.status = 'ready'
    and nullif(trim(p_query), '') is not null
    and c.search_vector @@ plainto_tsquery('english', p_query)
  order by rank desc, c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 5), 10));
$$;

revoke all on function public.match_knowledge_chunks(text, integer) from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(text, integer) to service_role;

create or replace function public.activate_paid_subscription(
  p_provider_reference text,
  p_amount_rwf bigint,
  p_currency text
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_plan public.plans;
  v_subscription public.subscriptions;
  v_period text;
  v_interval interval;
  v_base timestamptz;
begin
  select * into v_payment
  from public.payments
  where provider_reference = p_provider_reference
  for update;

  if not found then
    raise exception 'Payment record not found.';
  end if;

  if v_payment.status = 'successful' then
    select * into v_subscription
    from public.subscriptions
    where user_id = v_payment.user_id
      and status in ('active', 'trialing', 'past_due')
    order by created_at desc
    limit 1;
    if found then
      return v_subscription;
    end if;
  end if;

  if v_payment.status not in ('pending', 'failed') then
    raise exception 'Payment cannot be activated from status %.', v_payment.status;
  end if;
  if p_amount_rwf <> v_payment.amount_rwf then
    raise exception 'Verified amount does not match the payment record.';
  end if;
  if upper(p_currency) <> upper(v_payment.currency) then
    raise exception 'Verified currency does not match the payment record.';
  end if;

  select * into v_plan from public.plans where id = v_payment.plan_id and active = true;
  if not found then
    raise exception 'The purchased plan is no longer available.';
  end if;

  v_period := coalesce(v_payment.metadata ->> 'period', 'month');
  v_interval := case when v_period = 'year' then interval '1 year' else interval '1 month' end;

  update public.payments
  set status = 'successful', updated_at = now()
  where id = v_payment.id;

  select * into v_subscription
  from public.subscriptions
  where user_id = v_payment.user_id
    and status in ('active', 'trialing', 'past_due')
  order by created_at desc
  limit 1
  for update;

  if found then
    v_base := greatest(coalesce(v_subscription.current_period_end, now()), now());
    update public.subscriptions
    set plan_id = v_plan.id,
        status = 'active',
        current_period_start = now(),
        current_period_end = v_base + v_interval,
        cancel_at_period_end = false
    where id = v_subscription.id
    returning * into v_subscription;
  else
    insert into public.subscriptions (
      user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end
    )
    values (v_payment.user_id, v_plan.id, 'active', now(), now() + v_interval, false)
    returning * into v_subscription;
  end if;

  update public.profiles
  set storage_quota_bytes = greatest(storage_quota_bytes, v_plan.storage_bytes),
      updated_at = now()
  where id = v_payment.user_id;

  insert into public.audit_logs (actor_id, actor_email, event_type, severity, target_type, target_id, metadata)
  values (
    v_payment.user_id,
    (select email from public.profiles where id = v_payment.user_id),
    'billing.subscription_activated',
    'info',
    'payment',
    v_payment.id::text,
    jsonb_build_object('plan', v_plan.slug, 'period', v_period, 'provider', v_payment.provider)
  );

  return v_subscription;
end;
$$;

revoke all on function public.activate_paid_subscription(text, bigint, text) from public, anon, authenticated;
grant execute on function public.activate_paid_subscription(text, bigint, text) to service_role;
