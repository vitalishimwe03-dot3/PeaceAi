import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const code = params.get('code')
    const next = params.get('next') || '/app'
    if (!supabase) {
      navigate('/signin', { replace: true })
      return
    }
    const authClient = supabase
    const complete = async () => {
      if (code) {
        const { error: exchangeError } = await authClient.auth.exchangeCodeForSession(code)
        if (exchangeError && active) {
          setError(exchangeError.message)
          return
        }
      }
      if (active) navigate(next, { replace: true })
    }
    void complete()
    return () => {
      active = false
    }
  }, [navigate, params])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {error ? (
        <>
          <h1 className="text-2xl font-semibold">Verification could not complete</h1>
          <p className="mt-3 max-w-md text-sm text-slate-400">{error}</p>
          <Link to="/signin" className="mt-5 text-sm font-medium text-accent">
            Return to sign in
          </Link>
        </>
      ) : (
        <>
          <Spinner className="h-7 w-7" label="Completing sign-in" />
          <p className="mt-4 text-sm text-slate-400">Completing secure sign-in…</p>
        </>
      )}
    </div>
  )
}
