import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  Database,
  HardDrive,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, StatCard } from '@/components/layout/PageHeader'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  getDashboardStats,
  listAdminServiceRequests,
  listAdminUsers,
  listAuditLogs,
} from '@/lib/repository'
import { formatBytes, formatDate, formatRwf, getErrorMessage, relativeTime } from '@/lib/utils'
import type { AuditLog, ServiceRequest, Profile } from '@/types/domain'

type Stats = Awaited<ReturnType<typeof getDashboardStats>>

export function AdminOverviewPage() {
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [audit, setAudit] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardStats(), listAdminUsers(), listAdminServiceRequests(), listAuditLogs()])
      .then(([statsRow, userRows, requestRows, auditRows]) => {
        setStats(statsRow)
        setUsers(userRows)
        setRequests(requestRows)
        setAudit(auditRows)
      })
      .catch((err) => toast({ title: 'Could not load admin overview', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !stats) return <div className="flex justify-center py-20"><Spinner label="Loading administration" /></div>

  const pendingRequests = requests.filter((request) => !['completed', 'declined'].includes(request.status))

  return (
    <div>
      <PageHeader
        title="Admin overview"
        description="Platform activity, revenue, service requests, and recent security events."
        actions={<Badge tone="violet">Administrator</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Members" value={stats.users} hint="Registered profiles" icon={<Users className="h-4 w-4" />} />
        <StatCard label="AI messages today" value={stats.aiMessagesToday} hint={`${stats.conversations} conversations total`} icon={<Bot className="h-4 w-4" />} />
        <StatCard label="Open requests" value={pendingRequests.length} hint={`${stats.requests} requests all time`} icon={<BriefcaseBusiness className="h-4 w-4" />} />
        <StatCard label="Verified revenue" value={formatRwf(stats.revenue)} hint="Successful payments only" icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card-surface flex items-center gap-3 p-4">
          <HardDrive className="h-5 w-5 text-accent" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">Stored files</p>
            <p className="mt-0.5 text-sm text-white">{formatBytes(stats.storage)} · {stats.files} files</p>
          </div>
        </div>
        <div className="card-surface flex items-center gap-3 p-4">
          <Database className="h-5 w-5 text-sky-300" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">Messages recorded</p>
            <p className="mt-0.5 text-sm text-white">{stats.messages.toLocaleString('en-RW')}</p>
          </div>
        </div>
        <div className="card-surface flex items-center gap-3 p-4">
          <ShieldAlert className="h-5 w-5 text-amber-300" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">Security events</p>
            <p className="mt-0.5 text-sm text-white">{audit.filter((row) => row.severity !== 'info').length} recent warnings</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="card-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Recent members</h2>
            <Link to="/admin/users" className="flex items-center gap-1 text-[11px] text-accent hover:underline">Manage <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-3 divide-y divide-white/[0.05]">
            {users.slice(0, 6).map((profile) => (
              <div key={profile.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-300">{profile.full_name || 'Unnamed member'}</p>
                  <p className="truncate text-[10px] text-slate-600">{profile.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={profile.role === 'admin' ? 'violet' : 'neutral'}>{profile.role}</Badge>
                  <span className="text-[10px] text-slate-600">{formatDate(profile.created_at)}</span>
                </div>
              </div>
            ))}
            {!users.length ? <p className="py-6 text-center text-xs text-slate-500">No members yet.</p> : null}
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Recent service requests</h2>
            <Link to="/admin/requests" className="flex items-center gap-1 text-[11px] text-accent hover:underline">All requests <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-3 divide-y divide-white/[0.05]">
            {requests.slice(0, 6).map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-300">{request.service?.name || 'Service request'}</p>
                  <p className="truncate text-[10px] text-slate-600">{request.requirements.slice(0, 70)}</p>
                </div>
                <Badge tone={statusTone(request.status)}>{request.status}</Badge>
              </div>
            ))}
            {!requests.length ? <p className="py-6 text-center text-xs text-slate-500">No service requests yet.</p> : null}
          </div>
        </section>
      </div>

      <section className="card-surface mt-5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-white"><Activity className="h-4 w-4 text-accent" /> Recent audit events</h2>
          <Link to="/admin/audit" className="text-[11px] text-accent hover:underline">Full audit log</Link>
        </div>
        <div className="mt-3 divide-y divide-white/[0.05]">
          {audit.slice(0, 8).map((event) => (
            <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-300">{event.event_type}</p>
                <p className="truncate text-[10px] text-slate-600">{event.actor_email || 'System'} · {relativeTime(event.created_at)}</p>
              </div>
              <Badge tone={event.severity === 'critical' ? 'rose' : event.severity === 'warning' ? 'amber' : 'neutral'}>{event.severity}</Badge>
            </div>
          ))}
          {!audit.length ? <p className="py-6 text-center text-xs text-slate-500">No audit events recorded.</p> : null}
        </div>
      </section>

      <p className="mt-4 text-[10px] leading-4 text-slate-600">
        Administrator actions are sensitive. Changes to roles, quotas, plans, and settings should be traceable in the audit log.
        Revenue counts only payments recorded as successful after server verification.
      </p>
    </div>
  )
}
