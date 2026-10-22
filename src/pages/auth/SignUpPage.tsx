import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getErrorMessage } from '@/lib/utils'

export function SignUpPage() {
  const { user, signUp, previewSignIn, isPreview, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const next = params.get('next') || '/app'

  useEffect(() => {
    if (!authLoading && user) navigate(next, { replace: true })
  }, [user, authLoading, navigate, next])

  const strength = useMemo(() => {
    let score = 0
    if (password.length >= 10) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }, [password])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 10) {
      setError('Use a password with at least 10 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!accepted) {
      setError('You must accept the Terms of Service and Privacy Policy.')
      return
    }
    setLoading(true)
    try {
      const result = await signUp(email.trim(), password, fullName.trim())
      if (result.needsVerification) {
        setNeedsVerification(true)
      } else {
        navigate(next, { replace: true })
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Account creation failed.'))
    } finally {
      setLoading(false)
    }
  }

  const enterPreview = async () => {
    await previewSignIn('user')
    toast({ title: 'Local preview user', description: 'No real account was created.', tone: 'info' })
    navigate(next, { replace: true })
  }

  if (needsVerification) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Mail className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          We sent a verification link to <strong className="text-white">{email}</strong>. Verify your
          address to activate your account, then sign in.
        </p>
        <Link to="/signin" className="mt-8 inline-flex text-sm font-medium text-accent hover:text-accent-light">
          Go to sign in →
        </Link>
        <p className="mt-6 text-xs text-slate-600">
          If you do not receive the email, check spam or contact support. Email delivery depends on
          Supabase Auth and SMTP configuration.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-slate-400">
        Start free with AI assistance, 6 GiB private storage, and collaboration tools.
      </p>

      {isPreview ? (
        <div className="mt-6 rounded-2xl border border-accent/15 bg-accent/[0.04] p-4">
          <p className="text-sm font-semibold text-white">Preview access</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Supabase is not configured, so registration is disabled. Explore with a local preview user.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void enterPreview()}>
            Continue as preview user
          </Button>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Input
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          maxLength={100}
        />
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
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={10}
            hint="At least 10 characters. Use a unique password."
          />
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full ${
                  strength > index ? (strength >= 3 ? 'bg-accent' : 'bg-amber-400') : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
        <label className="flex items-start gap-2.5 text-xs leading-5 text-slate-400">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-ink-950 text-accent focus:ring-accent"
            required
          />
          <span>
            I agree to the{' '}
            <Link to="/legal/terms" className="text-accent hover:underline">Terms of Service</Link>,{' '}
            <Link to="/legal/privacy" className="text-accent hover:underline">Privacy Policy</Link>, and{' '}
            <Link to="/legal/acceptable-use" className="text-accent hover:underline">Acceptable Use Policy</Link>.
          </span>
        </label>
        {error ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs text-rose-300" role="alert">
            {error}
          </div>
        ) : null}
        <Button type="submit" className="w-full" loading={loading} disabled={isPreview}>
          Create account <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
        <p className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <CheckCircle2 className="h-4 w-4 text-accent" /> What happens next
        </p>
        <ul className="mt-2 space-y-1.5 text-[11px] text-slate-500">
          {['Verify your email address', 'Your Free plan is created', 'Administrator access is never granted through sign-up'].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-accent" /> {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to={`/signin${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-accent hover:text-accent-light">
          Sign in
        </Link>
      </p>
    </div>
  )
}
