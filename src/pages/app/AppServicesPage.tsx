import { useEffect, useState } from 'react'
import { ArrowUpRight, Clock, FileCheck2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { createServiceRequest, listServiceRequests, listServices } from '@/lib/repository'
import { formatDate, formatRwf, getErrorMessage } from '@/lib/utils'
import type { RequestStatus, Service, ServiceRequest } from '@/types/domain'

const requestStatusTone = (status: RequestStatus) => statusTone(status)

export function AppServicesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [serviceSlug, setServiceSlug] = useState('')
  const [requirements, setRequirements] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [serviceRows, requestRows] = await Promise.all([listServices(), listServiceRequests(user.id)])
      setServices(serviceRows)
      setRequests(requestRows)
    } catch (err) {
      toast({ title: 'Could not load services', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user) return null

  const openRequest = (service?: Service) => {
    setSelectedService(service ?? null)
    setServiceSlug(service?.slug ?? services[0]?.slug ?? '')
    setRequirements('')
    setBudget('')
    setDeadline('')
  }

  const submit = async () => {
    const chosenSlug = selectedService?.slug || serviceSlug
    const chosen = services.find((service) => service.slug === chosenSlug)
    if (!chosen) {
      toast({ title: 'Choose a service', tone: 'error' })
      return
    }
    if (requirements.trim().length < 40) {
      toast({ title: 'Add more detail', description: 'Please describe your requirements in at least 40 characters so the team can scope the work.', tone: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const created = await createServiceRequest(user.id, {
        serviceId: chosen.id,
        requirements: requirements.trim(),
        budget: budget ? Number(budget) : null,
        deadline: deadline || null,
      })
      setRequests((current) => [{ ...created, service: chosen }, ...current])
      setSelectedService(null)
      toast({ title: 'Request submitted', description: 'The team will review your request. A written quotation is required before any payment.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not submit request', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Services & project requests"
        description="Request cybersecurity, development, cloud, or training work. Every project begins with a written scope and quotation."
        actions={<Button size="sm" onClick={() => openRequest()}><Sparkles className="h-4 w-4" /> New request</Button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card-surface p-4">
          <FileCheck2 className="h-5 w-5 text-accent" />
          <p className="mt-2 text-xs font-medium text-white">Written quotation first</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">No payment is collected from this page. The team reviews scope and sends a quotation for approval.</p>
        </div>
        <div className="card-surface p-4">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <p className="mt-2 text-xs font-medium text-white">Defined responsibilities</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Deliverables, customer responsibilities, revisions, and acceptance criteria are agreed in writing.</p>
        </div>
        <div className="card-surface p-4">
          <Clock className="h-5 w-5 text-accent" />
          <p className="mt-2 text-xs font-medium text-white">Realistic timelines</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Timelines are confirmed after scoping. Urgent work is subject to availability and may carry a premium.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading services" /></div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div>
            <h2 className="mb-3 text-sm font-medium text-white">Available services</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <div key={service.id} className="card-surface flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-white">{service.name}</h3>
                    {service.price_from_rwf != null ? <Badge tone="accent">From {formatRwf(service.price_from_rwf)}</Badge> : <Badge>Quoted</Badge>}
                  </div>
                  <p className="mt-2 flex-1 text-[11px] leading-5 text-slate-500">{service.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {service.technologies.slice(0, 4).map((tech) => (
                      <span key={tech} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-500">{tech}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openRequest(service)}>Request quote</Button>
                    {service.slug ? (
                      <Link to={`/services/${service.slug}`} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`View ${service.name}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-white">Your requests</h2>
            {requests.length ? (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="card-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-medium text-slate-200">{request.service?.name || 'Service request'}</h3>
                      <Badge tone={requestStatusTone(request.status)}>{request.status}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-500">{request.requirements}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600">
                      <span>Submitted {formatDate(request.created_at)}</span>
                      {request.budget_rwf ? <span>Budget {formatRwf(request.budget_rwf)}</span> : null}
                      {request.preferred_deadline ? <span>Target {formatDate(request.preferred_deadline)}</span> : null}
                    </div>
                    {request.admin_notes ? (
                      <div className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.05] p-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-accent/70">Note from the team</p>
                        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-slate-300">{request.admin_notes}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileCheck2}
                title="No requests yet"
                description="Submit a request and the team will respond with a scoped quotation. You can track status here."
                action={<Button size="sm" onClick={() => openRequest()}>Start a request</Button>}
              />
            )}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selectedService) || Boolean(serviceSlug) || submitting}
        onClose={() => { if (!submitting) { setSelectedService(null); setServiceSlug('') } }}
        title="Request a project"
        description="Share your requirements. This creates a request for review — it is not a confirmed order or payment."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setSelectedService(null); setServiceSlug('') }} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void submit()} loading={submitting} disabled={requirements.trim().length < 40}>Submit request</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Service"
            value={selectedService?.slug || serviceSlug}
            onChange={(event) => {
              const next = services.find((service) => service.slug === event.target.value) ?? null
              setSelectedService(next)
              setServiceSlug(event.target.value)
            }}
            options={services.map((service) => ({ value: service.slug, label: service.name }))}
          />
          <Textarea
            label="Requirements"
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            rows={7}
            maxLength={5000}
            placeholder="Describe the problem, current systems, users affected, required outcomes, and any constraints. Do not include passwords, API keys, or personal data of third parties."
            hint={`${requirements.trim().length}/40 characters minimum · ${requirements.length}/5000`}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Budget (RWF, optional)"
              type="number"
              min={0}
              step={1000}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="e.g. 500000"
            />
            <Input
              label="Preferred deadline (optional)"
              type="date"
              value={deadline}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
          <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[10px] leading-5 text-slate-500">
            The team will review scope, dependencies, and availability before sending a quotation.
            Prices shown on service cards are starting points, not final quotes. Work begins only after
            written approval, and payment instructions will come through an official channel.
          </p>
        </div>
      </Modal>
    </div>
  )
}
