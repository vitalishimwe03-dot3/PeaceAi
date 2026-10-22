import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from './AuthLayout'

export function VerifyEmailPage() {
  return (
    <AuthLayout>
      <div className="text-center">
        <MailCheck className="mx-auto h-11 w-11 text-accent" />
        <h1 className="mt-5 text-3xl font-semibold">Verify your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Follow the verification link sent to your inbox. Once verified, you can sign in and open
          your PeaceAI workspace.
        </p>
        <Link to="/signin" className="mt-8 inline-flex text-sm font-medium text-accent hover:text-accent-light">
          Continue to sign in →
        </Link>
      </div>
    </AuthLayout>
  )
}
