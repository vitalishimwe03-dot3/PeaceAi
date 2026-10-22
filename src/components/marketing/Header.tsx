import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Button, buttonStyles } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'AI Assistant', to: '/assistant' },
  { label: 'AI Development', to: '/development' },
  { label: 'Cybersecurity', to: '/cybersecurity' },
  { label: 'Services', to: '/services' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact Us', to: '/contact' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="container-page flex h-[70px] items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white',
                isActive && 'text-white',
              )
            }
          >
            Home
          </NavLink>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white',
                  isActive && 'bg-white/[0.05] text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          {user ? (
            <>
              <Link to="/app" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 text-sm text-white transition-colors hover:bg-white/[0.06] focus-ring"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <Avatar name={user.profile.full_name} email={user.email} size="sm" />
                  <span className="max-w-[9rem] truncate">{user.profile.full_name || user.email}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {profileOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-ink-900 p-1.5 shadow-2xl"
                    role="menu"
                  >
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-white">{user.profile.full_name || 'PeaceAI user'}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <MenuLink to="/app" icon={LayoutDashboard} label="Dashboard" />
                    <MenuLink to="/app/settings" icon={UserRound} label="Account settings" />
                    <MenuLink to="/app/billing" icon={Settings} label="Plan and billing" />
                    {user.isAdmin ? <MenuLink to="/admin" icon={Shield} label="Administration" /> : null}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link to="/signin" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
                Sign In
              </Link>
              <Link to="/signup" className={buttonStyles({ size: 'sm' })}>
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white focus-ring xl:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/5 bg-ink-950 xl:hidden">
          <nav className="container-page flex max-h-[calc(100vh-70px)] flex-col gap-1 overflow-y-auto py-4" aria-label="Mobile navigation">
            <MobileLink to="/" label="Home" />
            {navItems.map((item) => (
              <MobileLink key={item.to} to={item.to} label={item.label} />
            ))}
            <div className="my-3 h-px bg-white/10" />
            {user ? (
              <>
                <div className="mb-2 flex items-center gap-3 px-3">
                  <Avatar name={user.profile.full_name} email={user.email} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{user.profile.full_name || 'PeaceAI user'}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <Link to="/app" className={buttonStyles({ className: 'mb-2 w-full' })}>
                  Open dashboard
                </Link>
                {user.isAdmin ? (
                  <Link to="/admin" className={buttonStyles({ variant: 'outline', className: 'mb-2 w-full' })}>
                    Administration
                  </Link>
                ) : null}
                <Button variant="ghost" onClick={handleSignOut} className="w-full">
                  Sign out
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-1 pb-2">
                <Link to="/signin" className={buttonStyles({ variant: 'outline', className: 'w-full' })}>
                  Sign In
                </Link>
                <Link to="/signup" className={buttonStyles({ className: 'w-full' })}>
                  Get Started
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  )
}

function MenuLink({ to, icon: Icon, label }: { to: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
      role="menuitem"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

function MobileLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white',
          isActive && 'bg-white/[0.05] text-white',
        )
      }
    >
      {label}
    </NavLink>
  )
}
