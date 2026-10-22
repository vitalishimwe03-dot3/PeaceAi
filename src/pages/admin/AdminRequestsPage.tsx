import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  listAdminServiceRequests,
  recordAuditEvent,
  updateServiceRequestStatus,
} from '@/lib/repository'
import { formatDate, formatRwf, getErrorMessage } from '@/lib/utils'
import type { RequestStatus, ServiceRequest } from '@/types/domain'

const statuses: RequestStatus[] = ['submitted', 'reviewing', 'quoted', 'approved', 'declined', 'completed']

export function AdminRequestsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | RequestStatus>('all')
  const [editRequest, setEditRequest] = useState<ServiceRequest | null>(null)
  const [status, setStatus] = useState<RequestStatus>('submitted')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listAdminServiceRequests()
      .then(setRequests)
      .catch((err) => toast({ title: 'Could not load requests', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase()
    return requests.filter((request) => {
      const matchesStatus = filter === 'all' || request.status === filter
      const matchesQuery =
        !lower ||
        request.requirements.toLowerCase().includes(lower) ||
        request.service?.name?.toLowerCase().includes(lower) ||
        request.profile?.email?.toLowerCase().includes(lower) ||
        request.profile?.full_name?.toLowerCase().includes(lower)
      return matchesStatus && matchesQuery
    })
  }, [requests, filter, query])

  const openEdit = (request: ServiceRequest) => {
    setEditRequest(request)
    setStatus(request.status)
    setNotes(request.admin_notes ?? '')
  }

  const save = async () => {
    if (!user || !editRequest) return
    setSaving(true)
    try {
      await updateServiceRequestStatus(editRequest.id, status, notes.trim() || null)
      setRequests((current) => current.map((request) => request.id === editRequest.id ? {
        ...request,
        status,
        admin_notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      } : request))
      await recordAuditEvent(user.id, 'admin.service_request_updated', 'info', {
        request_id: editRequest.id,
        status,
      })
      setEditRequest(null)
      toast({ title: 'Request updated', description: 'The member can see the status and any note you add.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update request', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Service requests"
        description="Review project requests, move them through the quotation workflow, and leave notes for the member."
        actions={<Badge tone="neutral">{requests.length} total</Badge>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search requests"
          aria-label="Search requests"
          leadingIcon={<Search className="h-4 w-4" />}
          containerClassName="w-full max-w-xs"
        />
        <Select
          aria-label="Filter status"
          value={filter}
          onChange={(event) => setFilter(event.target.value as 'all' | RequestStatus)}
          options={[{ value: 'all', label: 'All statuses' }, ...statuses.map((value) => ({ value, label: value }))]}
          containerClassName="w-40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading requests" /></div>
      ) : filtered.length ? (
        <div className="space-y-2.5">
          {filtered.map((request) => (
            <div key={request.id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-medium text-slate-200">{request.service?.name || 'Service request'}</h3>
                    <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {request.profile?.full_name || 'Member'} · {request.profile?.email || request.user_id.slice(0, 8)}
                    {' · '}Submitted {formatDate(request.created_at)}
                  </p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-400">{request.requirements}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600">
                    {request.budget_rwf ? <span>Budget {formatRwf(request.budget_rwf)}</span> : <span>No budget stated</span>}
                    {request.preferred_deadline ? <span>Target {formatDate(request.preferred_deadline)}</span> : null}
                    {request.admin_notes ? <span className="text-accent/70">Note added</span> : null}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(request)}>Review</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={BriefcaseBusiness} title="No requests match" description="Try a different search or status filter." />
      )}

      <Modal
        open={Boolean(editRequest)}
        onClose={() => { if (!saving) setEditRequest(null) }}
        title="Review request"
        description={editRequest ? `${editRequest.profile?.full_name || 'Member'} · ${editRequest.profile?.email || ''}` : undefined}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditRequest(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} loading={saving}>Save update</Button>
          </>
        }
      >
        {editRequest ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">Service</p>
              <p className="mt-1 text-xs text-slate-300">{editRequest.service?.name || 'Unknown service'}</p>
              <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-400">{editRequest.requirements}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-600">
                <span>{editRequest.budget_rwf ? `Budget ${formatRwf(editRequest.budget_rwf)}` : 'No budget stated'}</span>
                <span>{editRequest.preferred_deadline ? `Preferred deadline ${formatDate(editRequest.preferred_deadline)}` : 'No deadline stated'}</span>
              </div>
            </div>
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as RequestStatus)}
              options={statuses.map((value) => ({ value, label: value }))}
              hint="A quotation must be prepared outside this form and shared through an approved channel with clear terms."
            />
            <Textarea
              label="Note for the member (optional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Explain next steps, missing information, or the quotation status. Do not include payment credentials."
              hint="This note is visible to the member. Never request card numbers, mobile-money PINs, or passwords."
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
