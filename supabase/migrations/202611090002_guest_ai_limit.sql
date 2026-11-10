-- Give unregistered (anonymous/guest) visitors 15 free AI messages per day.
-- The limit stays server-enforced; the client only displays an estimate.

insert into public.system_settings (key, value)
values ('guest_ai_messages_per_day', to_jsonb(15))
on conflict (key) do nothing;

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
  v_guest_limit integer := 15;
  v_is_anonymous boolean := false;
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

  select coalesce(is_anonymous, false) into v_is_anonymous
  from auth.users where id = p_user_id;

  select coalesce((value)::text::integer, 15) into v_guest_limit
  from public.system_settings where key = 'guest_ai_messages_per_day';

  if v_is_anonymous then
    v_plan.ai_messages_per_day := least(v_plan.ai_messages_per_day, greatest(v_guest_limit, 0));
    v_plan.ai_requests_per_minute := least(v_plan.ai_requests_per_minute, 3);
    v_plan.premium_models := false;
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
