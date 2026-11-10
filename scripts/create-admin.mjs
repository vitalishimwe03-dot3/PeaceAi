import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const email = (process.env.ADMIN_EMAIL || 'vitalishimwe@gmail.com').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
const fullName = process.env.ADMIN_NAME || 'PeaceAI Administrator'

function fail(message) {
  console.error(`\nAdmin setup failed: ${message}\n`)
  process.exit(1)
}

if (!url || !serviceRoleKey) {
  fail('set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.')
}
if (!password || password.length < 10) {
  fail('set ADMIN_PASSWORD to a password with at least 10 characters.')
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === targetEmail)
    if (match) return match
    if (data.users.length < 1000) return null
  }
  return null
}

async function main() {
  let user = await findUserByEmail(email)

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), full_name: fullName },
    })
    if (error) throw error
    user = data.user
    console.log(`Updated existing auth user ${email}.`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error) throw error
    user = data.user
    console.log(`Created auth user ${email}.`)
  }

  if (!user) fail('Supabase did not return the admin user.')

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update({ role: 'admin', status: 'active', full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id,email,role,status')
      .maybeSingle()

    if (profileError) throw profileError
    if (profile) {
      console.log(`Promoted ${profile.email} to ${profile.role} (${profile.status}).`)
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  const { error: settingsError } = await admin
    .from('system_settings')
    .upsert(
      { key: 'support_email', value: email, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (settingsError) {
    console.warn(`Profile is ready, but support_email could not be updated: ${settingsError.message}`)
  }

  console.log('\nAdmin account is ready. Sign in with:')
  console.log(`  Email: ${email}`)
  console.log('  Password: the ADMIN_PASSWORD value you supplied (not printed here).')
}

main().catch((error) => fail(error?.message || String(error)))
