-- Promote the platform owner account to administrator.
-- The auth user must exist first. Create it with the secure provisioning script:
--   npm run admin:create
-- (uses SUPABASE_SERVICE_ROLE_KEY and never stores the password in the repo).

insert into public.system_settings (key, value)
values ('support_email', to_jsonb('vitalishimwe@gmail.com'::text))
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

update public.profiles
set role = 'admin',
    status = 'active',
    updated_at = now()
where lower(email) = lower('vitalishimwe@gmail.com');

-- Retire the previous owner address only when the new owner account exists,
-- so the platform never loses its last active administrator.
do $$
begin
  if exists (
    select 1 from public.profiles
    where lower(email) = lower('vitalishimwe@gmail.com')
      and role = 'admin'
      and status = 'active'
  ) then
    update public.profiles
    set role = 'user',
        updated_at = now()
    where lower(email) = lower('vitalishimwe03@gmail.com')
      and role = 'admin';
  else
    raise notice 'Create the vitalishimwe@gmail.com auth user, then re-run this migration to activate owner access.';
  end if;
end $$;
