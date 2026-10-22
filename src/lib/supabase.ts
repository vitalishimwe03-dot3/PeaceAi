import { createClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from './env'

export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = error.message
    try {
      const context = (error as { context?: Response }).context
      if (context) {
        const payload = (await context.json()) as { error?: string; message?: string }
        message = payload.error || payload.message || message
      }
    } catch {
      // Keep the original transport error.
    }
    throw new Error(message)
  }
  return data as T
}
