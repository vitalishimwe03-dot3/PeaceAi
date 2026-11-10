import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Shield, UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getErrorMessage } from '@/lib/utils'
import { GUEST_AI_MESSAGE_LIMIT } from '@/lib/env'

export function SignInPage() {
  const { user, signIn, signInAnonymously, previewSignIn, isPreview, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const next = params.get('next') || '/app'

  useEffect(() => {
    if (!authLoading && user) navigate(next, { replace: true })
  }, [user, authLoading, navigate, next])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Sign-in failed. Check your email and password.'))
    } finally {
      setLoading(false)
    }
  }

  const enterGuest = async () => {
    setError('')
    setLoading(true)
    try {
      await signInAnonymously()
      toast({ title: 'Continuing as guest', description: `You can send ${GUEST_AI_MESSAGE_LIMIT} free AI messages today.`, tone: 'info' })
      navigate(next, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Guest sign-in failed.'))
    } finally {
      setLoading(false)
    }
  }

  const enterPreview = async (role: 'user' | 'admin') => {
    try {
      await previewSignIn(role)
      toast({
        title: `Previewing as ${role}`,
        description: 'This is local demonstration data, not a real authenticated account.',
        tone: 'info',
      })
      navigate(role === 'admin' ? '/admin' : next, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-400">Sign in to continue to your PeaceAI workspace.</p>

      {isPreview ? (
        <div className="mt-6 rounded-2xl border border-accent/15 bg-accent/[0.04] p-4">
          <p className="text-sm font-semibold text-white">Preview access</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Choose a role to explore the interface with local data. No credentials are created and no
            server is contacted.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" size="sm" onClick={() => void enterPreview('user')}>
              <UserRound className="h-4 w-4" /> Preview as user
            </Button>
            <Button variant="outline" size="sm" onClick={() => void enterPreview('admin')}>
              <Shield className="h-4 w-4" /> Preview as admin
            </Button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="signin-password" className="text-sm font-medium text-slate-200">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-accent hover:text-accent-light">
              Forgot password?
            </Link>
          </div>
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs text-rose-300" role="alert">
            {error}
          </div>
        ) : null}
        <Button type="submit" className="w-full" loading={loading} disabled={isPreview}>
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
        {isPreview ? (
          <p className="text-center text-[11px] text-slate-500">
            Email sign-in is disabled until Supabase is configured.
          </p>
        ) : null}
      </form>

      {!isPreview ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void enterGuest()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            Continue as guest
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            Guest sessions include {GUEST_AI_MESSAGE_LIMIT} free AI messages per day.
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-400">
        New to PeaceAI?{' '}
        <Link to={`/signup${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-accent hover:text-accent-light">
          Create an account
        </Link>
      </p>
      <p className="mt-8 text-center text-[11px] leading-5 text-slate-600">
        By signing in, you agree to the{' '}
        <Link to="/legal/terms" className="underline hover:text-slate-400">Terms of Service</Link> and{' '}
        <Link to="/legal/privacy" className="underline hover:text-slate-400">Privacy Policy</Link>.
      </p>
    </div>
  )
}
