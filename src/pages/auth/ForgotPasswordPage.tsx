import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getErrorMessage } from '@/lib/utils'

export function ForgotPasswordPage() {
  const { resetPassword, isPreview } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Password reset could not be started.'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <Mail className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-5 text-3xl font-semibold">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          If an account exists for <strong className="text-white">{email}</strong>, a password reset
          link has been sent. For security, we do not reveal whether an address is registered.
        </p>
        <Link to="/signin" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/signin" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Enter your account email and we will send a secure reset link if the account exists.
      </p>
      {isPreview ? (
        <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100/80">
          Supabase is not configured, so password reset emails are unavailable. The form is shown for
          interface review only.
        </div>
      ) : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
        />
        {error ? (
          <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" loading={loading} disabled={isPreview}>
          Send reset link
        </Button>
      </form>
    </div>
  )
}
