import { useEffect, useMemo, useState } from 'react'
import { Activity, Search } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { listAuditLogs } from '@/lib/repository'
import { formatDate, getErrorMessage, relativeTime } from '@/lib/utils'
import type { AuditLog, AuditSeverity } from '@/types/domain'

export function AdminAuditPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState<'all' | AuditSeverity>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    listAuditLogs()
      .then(setLogs)
      .catch((err) => toast({ title: 'Could not load audit log', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase()
    return logs.filter((log) => {
      const matchesSeverity = severity === 'all' || log.severity === severity
      const matchesQuery =
        !lower ||
        log.event_type.toLowerCase().includes(lower) ||
        log.actor_email?.toLowerCase().includes(lower) ||
        log.target_id?.toLowerCase().includes(lower)
      return matchesSeverity && matchesQuery
    })
  }, [logs, query, severity])

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Recent security-relevant events. Audit records are read-only in this interface and should be protected from tampering."
        actions={<Badge tone="neutral">{logs.length} recent events</Badge>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search event, actor, or target"
          aria-label="Search audit log"
          leadingIcon={<Search className="h-4 w-4" />}
          containerClassName="w-full max-w-xs"
        />
        <Select
          aria-label="Filter severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value as 'all' | AuditSeverity)}
          options={[
            { value: 'all', label: 'All severities' },
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
            { value: 'critical', label: 'Critical' },
          ]}
          containerClassName="w-40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading audit log" /></div>
      ) : filtered.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
          {filtered.map((log) => (
            <div key={log.id} className="border-b border-white/[0.05] last:border-0">
              <button
                type="button"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
              >
                <span className={cnSeverity(log.severity)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-300">{log.event_type}</p>
                  <p className="truncate text-[10px] text-slate-600">
                    {log.actor_email || log.actor_id || 'System'} · {formatDate(log.created_at, true)} · {relativeTime(log.created_at)}
                  </p>
                </div>
                <Badge tone={log.severity === 'critical' ? 'rose' : log.severity === 'warning' ? 'amber' : 'neutral'}>{log.severity}</Badge>
              </button>
              {expanded === log.id ? (
                <div className="border-t border-white/[0.05] bg-ink-950/40 px-4 py-3">
                  <div className="grid gap-2 text-[10px] text-slate-500 sm:grid-cols-2">
                    <p>Event ID <span className="font-mono text-slate-400">{log.id}</span></p>
                    <p>Actor ID <span className="font-mono text-slate-400">{log.actor_id || '—'}</span></p>
                    <p>Target type <span className="text-slate-400">{log.target_type || '—'}</span></p>
                    <p>Target ID <span className="font-mono text-slate-400">{log.target_id || '—'}</span></p>
                  </div>
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/[0.06] bg-ink-950 p-3 font-mono text-[10px] leading-5 text-slate-400">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Activity} title="No audit events match" description="Try a different search or severity filter." />
      )}

      <p className="mt-4 text-[10px] leading-4 text-slate-600">
        The audit log is limited to recent records in this view. Production retention, export, and tamper protection must be
        configured according to the security policy. Administrators should not be able to silently erase their own audit trail.
      </p>
    </div>
  )
}

function cnSeverity(severity: AuditSeverity) {
  return severity === 'critical'
    ? 'h-2 w-2 shrink-0 rounded-full bg-rose-400'
    : severity === 'warning'
      ? 'h-2 w-2 shrink-0 rounded-full bg-amber-400'
      : 'h-2 w-2 shrink-0 rounded-full bg-slate-600'
}
