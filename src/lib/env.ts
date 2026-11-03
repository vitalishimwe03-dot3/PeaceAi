export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  siteUrl: import.meta.env.VITE_SITE_URL?.trim() || window.location.origin,
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL?.trim() || 'vitalishimwe03@gmail.com',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE?.trim() || '0792448989',
}

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)

export const APP_NAME = 'PeaceAI'
export const GIB = 1024 * 1024 * 1024
// A profile quota of 0 means "inherit the storage allowance from the active plan".
export const DEFAULT_STORAGE_QUOTA_BYTES = 0
// The owner administrator always receives the largest allocation on the platform.
export const ADMIN_STORAGE_QUOTA_BYTES = 500 * GIB
