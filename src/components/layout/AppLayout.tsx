import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Bot,
  ChevronDown,
  Code2,
  CreditCard,
  Files,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Settings,
  Shield,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const userNav = [
  { label: 'Overview', to: '/app', end: true, icon: LayoutDashboard },
  { label: 'AI Assistant', to: '/app/assistant', icon: Bot },
  { label: 'AI Development', to: '/app/development', icon: Code2 },
  { label: 'Cloud Storage', to: '/app/storage', icon: Files },
  { label: 'Collaboration', to: '/app/collaboration', icon: MessagesSquare },
  { label: 'Service Requests', to: '/app/services', icon: Wrench },
  { label: 'Usage', to: '/app/usage', icon: Gauge },
  { label: 'Plan & Billing', to: '/app/billing', icon: CreditCard },
  { label: 'Settings', to: '/app/settings', icon: Settings },
]

export function AppLayout() {
  const { user, signOut, isPreview } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-ink-950">
      {isPreview ? (
        <div className="border-b border-amber-400/20 bg-amber-400/[0.07] px-4 py-1.5 text-center text-[11px] text-amber-200/80">
          Local preview mode · data stays in this browser · no real AI, email, or payments
        </div>
      ) : null}
      <div className="flex">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.06] bg-ink-900/95 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-label="Workspace navigation"
        >
          <div className="flex h-[70px] items-center justify-between border-b border-white/[0.06] px-5">
            <Logo />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
              Workspace
            </p>
            <nav className="space-y-0.5">
              {userNav.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </nav>

            {user.isAdmin ? (
              <>
                <p className="px-2 pb-2 pt-6 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
                  Administration
                </p>
                <nav className="space-y-0.5">
                  <SidebarLink label="Admin dashboard" to="/admin" end icon={Shield} />
                </nav>
              </>
            ) : null}
          </div>

          <div className="border-t border-white/[0.06] p-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">Secure workspace</span>
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
              <p className="mt-1 text-[10px] leading-4 text-slate-600">
                Private by default. Review generated work before use.
              </p>
            </div>
            <Link
              to="/"
              className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300"
            >
              <Sparkles className="h-3.5 w-3.5" /> Public website
            </Link>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-ink-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation overlay"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between gap-4 border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">
                  {user.profile.full_name || user.email}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isPreview ? 'Local preview session' : user.profile.role === 'admin' ? 'Administrator' : 'PeaceAI member'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone="accent" className="hidden sm:inline-flex">
                {isPreview ? 'Preview' : user.profile.status}
              </Badge>
              <Link
                to="/app/usage"
                className="relative rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Usage and notifications"
              >
                <Bell className="h-5 w-5" />
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pr-2.5 transition-colors hover:bg-white/[0.06] focus-ring"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <Avatar name={user.profile.full_name} email={user.email} size="sm" />
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-ink-900 p-1.5 shadow-2xl" role="menu">
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-white">{user.profile.full_name || 'PeaceAI user'}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Link to="/app/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5" role="menuitem">
                      <Settings className="h-4 w-4" /> Account settings
                    </Link>
                    {user.isAdmin ? (
                      <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5" role="menuitem">
                        <Shield className="h-4 w-4" /> Administration
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

function SidebarLink({
  label,
  to,
  end,
  icon: Icon,
}: {
  label: string
  to: string
  end?: boolean
  icon: typeof LayoutDashboard
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
          isActive
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}
