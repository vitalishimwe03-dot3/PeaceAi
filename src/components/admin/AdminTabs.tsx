import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity,
  Bot,
  BriefcaseBusiness,
  Database,
  Gauge,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/admin', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/ai', label: 'AI models', icon: Bot },
  { to: '/admin/knowledge', label: 'Knowledge', icon: Database },
  { to: '/admin/requests', label: 'Requests', icon: BriefcaseBusiness },
  { to: '/admin/services', label: 'Services', icon: Gauge },
  { to: '/admin/plans', label: 'Plans', icon: ShieldCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/audit', label: 'Audit log', icon: Activity },
]

export function AdminLayout() {
  return (
    <div>
      <div className="mb-6 border-b border-white/[0.07] pb-3">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Administration</p>
        </div>
        <nav className="-mb-3 flex gap-1 overflow-x-auto" aria-label="Admin sections">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs transition-colors',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-slate-500 hover:text-slate-300',
                )
              }
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
