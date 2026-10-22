import { Link, Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowUp } from 'lucide-react'
import { Header } from './Header'
import { Footer } from './Footer'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export function PublicLayout() {
  const { isPreview } = useAuth()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      {isPreview ? <PreviewBanner /> : null}
      <Header />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}

function PreviewBanner() {
  return (
    <div className="relative z-50 border-b border-amber-400/20 bg-amber-400/[0.07]">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-center text-xs text-amber-200/90">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-semibold">Local preview mode.</span>
        <span className="text-amber-200/70">
          Supabase and AI credentials are not configured. Preview data stays in this browser and no real AI or payments run.
        </span>
        <Link to="/about#configuration" className="underline underline-offset-2 hover:text-amber-100">
          Setup details
        </Link>
      </div>
    </div>
  )
}

function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 left-5 z-30 hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink-900/80 text-slate-400 backdrop-blur transition-colors hover:text-white focus-ring md:flex"
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  )
}
