import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export class HttpError extends Error {
  status: number
  details?: Record<string, unknown>

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

export function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new HttpError(500, 'Supabase server credentials are not configured.')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireUser(req: Request): Promise<{ user: User; admin: SupabaseClient }> {
  const header = req.headers.get('Authorization') ?? ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'Sign in is required.')
  }
  const token = header.slice(7).trim()
  if (!token) throw new HttpError(401, 'Sign in is required.')

  const admin = serviceClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    throw new HttpError(401, 'Your session is invalid or has expired. Sign in again.')
  }
  return { user: data.user, admin }
}

export async function requireActiveProfile(
  admin: SupabaseClient,
  userId: string,
): Promise<{ id: string; email: string; full_name: string | null; role: string; status: string }> {
  const { data, error } = await admin
    .from('profiles')
    .select('id,email,full_name,role,status')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new HttpError(500, 'Could not load your profile.')
  if (!data) throw new HttpError(403, 'No PeaceAI profile exists for this account.')
  if (data.status !== 'active') {
    throw new HttpError(403, 'This account is suspended. Contact support.')
  }
  return data
}

export async function requireAdmin(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data, error } = await admin
    .from('profiles')
    .select('role,status')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new HttpError(500, 'Could not verify administrator access.')
  if (!data || data.role !== 'admin' || data.status !== 'active') {
    throw new HttpError(403, 'Administrator access is required.')
  }
}

export async function parseJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, 'The request body must be valid JSON.')
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message, ...(error.details ?? {}) }, error.status)
  }
  const record = error as { message?: string; code?: string; status?: number }
  if (record?.code === 'P0001' || record?.code === 'P0002' || record?.code === '42501') {
    const status = record.code === 'P0001' ? 429 : record.code === '42501' ? 403 : 404
    return json({ error: record.message ?? 'The request was rejected.' }, status)
  }
  console.error('Unhandled function error', error)
  return json({ error: record?.message || 'An unexpected server error occurred.' }, 500)
}
