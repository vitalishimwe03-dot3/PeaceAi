import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FileCheck2,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getService, createServiceRequest } from '@/lib/repository'
import { useToast } from '@/contexts/ToastContext'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { formatRwf, getErrorMessage } from '@/lib/utils'
import type { Service } from '@/types/domain'

export function ServiceDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requirements, setRequirements] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    getService(slug)
      .then((result) => {
        if (active) setService(result)
      })
      .catch(() => {
        if (active) setService(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug])

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !service) return
    if (requirements.trim().length < 30) {
      toast({ title: 'Add more detail', description: 'Describe your requirements in at least 30 characters.', tone: 'error' })
      return
    }
    setSubmitting(true)
    try {
      await createServiceRequest(user.id, {
        serviceId: service.id,
        requirements: requirements.trim(),
        budget: budget ? Number(budget) : null,
        deadline: deadline || null,
      })
      setOpen(false)
      setRequirements('')
      setBudget('')
      setDeadline('')
      toast({
        title: 'Request submitted',
        description: 'Your request is now in the PeaceAI review queue. A binding quotation requires administrator approval.',
        tone: 'success',
      })
    } catch (error) {
      toast({ title: 'Could not submit request', description: getErrorMessage(error), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading service" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-semibold">Service not found</h1>
        <p className="mt-3 text-slate-400">This service may be disabled or no longer available.</p>
        <Link to="/services" className={buttonStyles({ className: 'mt-6' })}>
          Browse services
        </Link>
      </div>
    )
  }

  return (
    <>
      <section className="border-b border-white/[0.06] bg-ink-900/30">
        <div className="container-page py-10">
          <Link to="/services" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> All services
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
            <div>
              <Badge tone="neutral">{service.category?.name ?? 'Service'}</Badge>
              <h1 className="mt-4 text-balance text-3xl font-semibold sm:text-4xl">{service.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">{service.short_description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="accent"><Clock className="h-3 w-3" /> {service.estimated_timeline}</Badge>
                <Badge tone="blue"><ShieldCheck className="h-3 w-3" /> Reviewed quotation</Badge>
                <Badge tone="neutral"><Layers className="h-3 w-3" /> Defined deliverables</Badge>
              </div>
            </div>
            <aside className="card-surface p-6">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Indicative range</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">
                {service.price_from_rwf
                  ? `${formatRwf(service.price_from_rwf)}${service.price_to_rwf ? ` – ${formatRwf(service.price_to_rwf)}` : '+'}`
                  : 'Request a quote'}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Estimates are not binding. Final pricing depends on confirmed scope and a written quotation.
              </p>
              {user ? (
                <Button className="mt-5 w-full" onClick={() => setOpen(true)}>
                  Request this service <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link to={`/signin?next=/services/${service.slug}`} className={buttonStyles({ className: 'mt-5 w-full' })}>
                  Sign in to request
                </Link>
              )}
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Submitting a request does not create a payment obligation.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <DetailSection title="Service description">
            <p className="text-sm leading-7 text-slate-300">{service.description}</p>
          </DetailSection>

          <DetailSection title="What we need from you">
            <p className="text-sm leading-7 text-slate-300">{service.requirements}</p>
          </DetailSection>

          <DetailSection title="Included deliverables">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {service.deliverables.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {item}
                </li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection title="Technologies that may be used">
            <div className="flex flex-wrap gap-2">
              {service.technologies.map((tech) => (
                <span key={tech} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300">
                  {tech}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Technologies are selected after discovery and may change to fit your constraints.
            </p>
          </DetailSection>

          <DetailSection title="Quotation factors">
            <ul className="space-y-2">
              {service.quote_factors.map((factor) => (
                <li key={factor} className="flex gap-2.5 text-sm text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {factor}
                </li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection title="Your responsibilities">
            <ul className="space-y-2">
              {service.customer_responsibilities.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {item}
                </li>
              ))}
            </ul>
          </DetailSection>

          <DetailSection title="Terms and limitations">
            <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
              <div className="flex gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <p className="text-xs leading-6 text-amber-100/70">{service.terms}</p>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Delivery and revisions">
            <p className="text-sm leading-7 text-slate-300">{service.revision_policy}</p>
          </DetailSection>
        </div>

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FileCheck2 className="h-4 w-4 text-accent" /> How requesting works
            </h2>
            <ol className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
              <li><span className="mr-1.5 font-mono text-accent">01</span> Submit requirements, budget, and preferred deadline.</li>
              <li><span className="mr-1.5 font-mono text-accent">02</span> PeaceAI reviews scope and dependencies.</li>
              <li><span className="mr-1.5 font-mono text-accent">03</span> You receive clarifying questions or a quotation.</li>
              <li><span className="mr-1.5 font-mono text-accent">04</span> Work starts only after written approval.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold">Need to discuss first?</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Ask a question before submitting requirements. We will tell you if the service is a good fit.
            </p>
            <Link to="/contact" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
              Contact the team <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Request: ${service.name}`}
        description="Share enough detail for a useful review. This does not create a binding quotation or payment."
      >
        <form onSubmit={submitRequest} className="space-y-4">
          <Textarea
            label="Project requirements"
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder="Describe the problem, expected users, required features, current systems, and any constraints…"
            rows={6}
            required
            hint="At least 30 characters. Do not include passwords or secret keys."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Budget in RWF"
              type="number"
              min={0}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Optional"
              optional
            />
            <Input
              label="Preferred deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              optional
            />
          </div>
          <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3.5 text-xs leading-5 text-amber-100/70">
            Automatic estimates are not binding. A quotation becomes valid only after PeaceAI review
            and approval. Do not submit confidential production credentials.
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit request
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}
