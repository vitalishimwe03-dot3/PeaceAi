-- Promote the platform owner account to administrator.
-- Run this after creating the auth user for vitalishimwe03@gmail.com
-- (via Supabase Dashboard -> Authentication -> Users -> Add user, or via the app sign-up flow).
-- Idempotent: only updates an existing profile; never creates auth credentials.

update public.profiles
set role = 'admin',
    status = 'active',
    updated_at = now()
where lower(email) = lower('vitalishimwe03@gmail.com');

-- Safety: ensure at least one active admin remains.
do $$
begin
  if not exists (select 1 from public.profiles where role = 'admin' and status = 'active') then
    raise notice 'No active admin profile found for vitalishimwe03@gmail.com yet. Create the auth user first, then re-run this migration.';
  end if;
end $$;