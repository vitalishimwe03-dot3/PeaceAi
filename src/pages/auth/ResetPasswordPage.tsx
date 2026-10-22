import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getErrorMessage } from '@/lib/utils'

export function ResetPasswordPage() {
  const { updatePassword, isPreview, user } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      window.setTimeout(() => navigate('/app', { replace: true }), 1800)
    } catch (err) {
      setError(getErrorMessage(err, 'Password could not be updated. The reset link may have expired.'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-11 w-11 text-accent" />
        <h1 className="mt-5 text-3xl font-semibold">Password updated</h1>
        <p className="mt-3 text-sm text-slate-400">Redirecting you to your workspace…</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Use a strong, unique password that you do not use on other services.
      </p>
      {!user || isPreview ? (
        <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100/80">
          {isPreview
            ? 'Supabase is not configured, so password reset is unavailable in preview mode.'
            : 'Open this page from a valid password reset link. The recovery session is required.'}
        </div>
      ) : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={10}
          hint="At least 10 characters."
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
        {error ? (
          <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" loading={loading} disabled={!user || isPreview}>
          Update password
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">
        <Link to="/signin" className="hover:text-white">Return to sign in</Link>
      </p>
    </div>
  )
}
