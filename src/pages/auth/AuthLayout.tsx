import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'

export function AuthLayout({ children }: { children?: ReactNode }) {
  const { isPreview } = useAuth()
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-xs text-slate-400 transition-colors hover:text-white">
            Back to website
          </Link>
        </div>
        <main id="main-content" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            {isPreview ? (
              <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs leading-5 text-amber-100/80">
                <strong className="text-amber-100">Local preview.</strong> Supabase authentication is
                not configured. Use the preview access buttons on the sign-in page. No real account is created.
              </div>
            ) : null}
            {children ?? <Outlet />}
          </div>
        </main>
        <p className="text-center text-[11px] text-slate-600">
          © {new Date().getFullYear()} PeaceAI. Secure sessions and server-enforced access.
        </p>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-white/[0.06] bg-ink-900/50 lg:flex lg:flex-col lg:justify-between lg:p-16">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-accent/[0.08] blur-3xl" aria-hidden="true" />
        <div className="relative">
          <span className="eyebrow">
            <Sparkles className="h-3.5 w-3.5" /> One secure workspace
          </span>
          <h1 className="mt-6 text-balance font-display text-4xl font-semibold leading-tight">
            Imagine it. Build it. Secure it.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
            Conversations, project planning, private storage, collaboration, and defensive security
            services in one account.
          </p>
        </div>
        <div className="relative space-y-3">
          {[
            { icon: Lock, title: 'Private by default', text: 'Your files and conversations are protected by row-level security.' },
            { icon: ShieldCheck, title: 'Server-enforced limits', text: 'Roles, quotas, and sharing permissions are validated in the backend.' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-400">{item.text}</p>
              </div>
            </div>
          ))}
          <p className="pt-3 text-[11px] leading-5 text-slate-600">
            AI outputs can be incorrect. Review generated code and plans before use.
          </p>
        </div>
      </aside>
    </div>
  )
}
