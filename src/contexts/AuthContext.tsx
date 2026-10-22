import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import { getProfile, preview, updateProfile } from '@/lib/repository'
import type { Profile } from '@/types/domain'

export interface AppUser {
  id: string
  email: string
  profile: Profile
  isAdmin: boolean
  isPreview: boolean
}

interface AuthContextValue {
  user: AppUser | null
  session: Session | null
  loading: boolean
  configured: boolean
  isPreview: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsVerification: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateEmail: (email: string) => Promise<{ confirmationRequired: boolean }>
  updateProfileDetails: (patch: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) => Promise<void>
  refresh: () => Promise<void>
  previewSignIn: (role: 'user' | 'admin') => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toAppUser(profile: Profile, isPreview = false): AppUser {
  return {
    id: profile.id,
    email: profile.email,
    profile,
    isAdmin: profile.role === 'admin',
    isPreview,
  }
}

function fallbackProfile(session: Session): Profile {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    full_name: (session.user.user_metadata?.full_name as string | undefined) ?? null,
    avatar_url: (session.user.user_metadata?.avatar_url as string | undefined) ?? null,
    role: 'user',
    status: 'active',
    storage_quota_bytes: 6 * 1024 * 1024 * 1024,
    created_at: session.user.created_at,
    updated_at: new Date().toISOString(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession) {
      setUser(null)
      return
    }
    try {
      const profile = await getProfile(nextSession.user.id)
      setUser(toAppUser(profile ?? fallbackProfile(nextSession)))
    } catch {
      setUser(toAppUser(fallbackProfile(nextSession)))
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const previewProfile = preview.profile()
      setUser(previewProfile ? toAppUser(previewProfile, true) : null)
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      void hydrate(data.session).finally(() => {
        if (active) setLoading(false)
      })
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      void hydrate(nextSession)
      setLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [hydrate])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase authentication is not configured.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session) await hydrate(data.session)
  }, [hydrate])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!supabase) throw new Error('Supabase authentication is not configured.')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${env.siteUrl}/auth/callback`,
        },
      })
      if (error) throw error
      return { needsVerification: Boolean(data.user && !data.session) }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
    preview.signOut()
    setUser(null)
    setSession(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase authentication is not configured.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.siteUrl}/reset-password`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase authentication is not configured.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const updateEmail = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase authentication is not configured.')
    const { data, error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${env.siteUrl}/auth/callback` },
    )
    if (error) throw error
    return { confirmationRequired: Boolean(data.user && data.user.email !== email) }
  }, [])

  const updateProfileDetails = useCallback(
    async (patch: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) => {
      if (!user) throw new Error('You must be signed in.')
      if (user.isPreview) {
        const updated = await updateProfile(user.id, patch)
        setUser(toAppUser(updated, true))
        return
      }
      const updated = await updateProfile(user.id, patch)
      setUser(toAppUser(updated))
    },
    [user],
  )

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const previewProfile = preview.profile()
      setUser(previewProfile ? toAppUser(previewProfile, true) : null)
      return
    }
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    await hydrate(data.session)
  }, [hydrate])

  const previewSignIn = useCallback(async (role: 'user' | 'admin') => {
    if (isSupabaseConfigured) throw new Error('Preview sign-in is disabled when Supabase is configured.')
    const profile = preview.signIn(role)
    setUser(toAppUser(profile, true))
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('You must be signed in.')
    if (user.isPreview) {
      await signOut()
      return
    }
    const { error } = await supabase!.functions.invoke('delete-account')
    if (error) throw new Error('Account deletion could not be started. Contact support.')
    await signOut()
  }, [user, signOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      configured: isSupabaseConfigured,
      isPreview: !isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updateProfileDetails,
      refresh,
      previewSignIn,
      deleteAccount,
    }),
    [
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updateProfileDetails,
      refresh,
      previewSignIn,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
