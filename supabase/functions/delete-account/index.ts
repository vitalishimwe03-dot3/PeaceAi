import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { HttpError, handleError, json, preflight, requireActiveProfile, requireUser, serviceClient } from '../_shared/http.ts'

// Authenticated account deletion. Uses service role only after verifying the caller.
// Adapt data retention/export to your legal/policy requirements before production use.
serve(async (req) => {
  const options = preflight(req)
  if (options) return options
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)
  try {
    const { user, admin } = await requireUser(req)
    const profile = await requireActiveProfile(admin, user.id)
    if (profile.role === 'admin') {
      throw new HttpError(403, 'Admin accounts must be handled by an administrator workflow to prevent lockout.')
    }

    // Best-effort data cleanup (respect FK/cascade design in your schema).
    await admin.from('profiles').delete().eq('id', user.id).catch(() => null)
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw new HttpError(500, 'Could not delete the authentication account. Please contact support.')

    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
})