import { useEffect, useState } from 'react'
import {
  AppWindow,
  ArrowUpRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { createAppDelivery, listAppDeliveries, listServices } from '@/lib/repository'
import { formatDate, formatRwf, getErrorMessage } from '@/lib/utils'
import type { AppDelivery, DeliveryStatus, Service } from '@/types/domain'

const deliveryTone: Record<DeliveryStatus, 'neutral' | 'blue' | 'accent' | 'amber' | 'violet'> = {
  requested: 'neutral',
  building: 'blue',
  ready: 'amber',
  delivered: 'accent',
  live: 'violet',
}

const stages: Array<{ status: DeliveryStatus; label: string }> = [
  { status: 'requested', label: 'Requested' },
  { status: 'building', label: 'Building' },
  { status: 'ready', label: 'Ready' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'live', label: 'Live' },
]

export function AppAppsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<AppDelivery[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ serviceId: '', projectName: '', description: '' })

  const load = () => {
    if (!user) return
    setLoading(true)
    Promise.all([listAppDeliveries(user.id), listServices()])
      .then(([rows, catalog]) => {
        setDeliveries(rows)
        setServices(catalog)
        setForm((current) => ({
          ...current,
          serviceId: current.serviceId || catalog[0]?.id || '',
        }))
      })
      .catch((err) =>
        toast({ title: 'Could not load your apps', description: getErrorMessage(err), tone: 'error' }),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const submit = async () => {
    if (!user) return
    if (!form.serviceId || !form.projectName.trim()) {
      toast({ title: 'Add a project name', description: 'Choose a service and name the build.', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await createAppDelivery(user.id, {
        serviceId: form.serviceId,
        projectName: form.projectName.trim(),
        description: form.description.trim(),
      })
      toast({
        title: 'Build requested',
        description: 'We will review the brief, quote it, and begin work after payment.',
        tone: 'success',
      })
      setOpen(false)
      setForm({ serviceId: form.serviceId, projectName: '', description: '' })
      load()
    } catch (err) {
      toast({ title: 'Could not request a build', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const copy = (label: string, value: string | null) => {
    if (!value) return
    void navigator.clipboard?.writeText(value).then(
      () => toast({ title: `${label} copied`, tone: 'success' }),
      () => toast({ title: 'Could not copy', description: 'Select and copy the value manually.', tone: 'error' }),
    )
  }

  return (
    <div>
      <PageHeader
        title="My apps"
        description="Commission a build, follow its progress, and collect your live credentials after the balance is settled."
        actions={
          <Button size="sm" onClick={() => setOpen(true)} disabled={!services.length}>
            <Plus className="h-4 w-4" /> Request a build
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Loading your apps" />
        </div>
      ) : deliveries.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {deliveries.map((delivery) => {
            const stageIndex = stages.findIndex((stage) => stage.status === delivery.status)
            const credentials = delivery.credentials
            const reveal = revealed[delivery.id]
            return (
              <article key={delivery.id} className="card-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">{delivery.project_name}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {delivery.service?.name ?? 'Custom build'} · requested{' '}
                      {formatDate(delivery.requested_at)}
                    </p>
                  </div>
                  <Badge tone={deliveryTone[delivery.status]}>{delivery.status}</Badge>
                </div>

                {delivery.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                    {delivery.description}
                  </p>
                ) : null}

                <div className="mt-4 flex items-center gap-1" aria-label="Delivery progress">
                  {stages.map((stage, index) => (
                    <div key={stage.status} className="flex flex-1 flex-col gap-1.5">
                      <div
                        className={
                          index <= stageIndex
                            ? 'h-1 rounded-full bg-accent'
                            : 'h-1 rounded-full bg-white/10'
                        }
                      />
                      <span
                        className={
                          index <= stageIndex
                            ? 'text-[10px] font-medium text-accent'
                            : 'text-[10px] text-slate-600'
                        }
                      >
                        {stage.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone={delivery.payment_status === 'paid' ? 'accent' : 'rose'}>
                    Payment {delivery.payment_status}
                  </Badge>
                  <span className="text-slate-400">
                    {delivery.price_rwf > 0 ? formatRwf(delivery.price_rwf) : 'Quotation pending'}
                  </span>
                </div>

                {delivery.admin_notes ? (
                  <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] leading-5 text-slate-400">
                    {delivery.admin_notes}
                  </p>
                ) : null}

                <div className="mt-5 rounded-xl border border-white/10 bg-ink-950/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-xs font-medium text-white">
                      <KeyRound className="h-3.5 w-3.5 text-accent" /> App credentials
                    </p>
                    {delivery.credentials_released ? (
                      <Badge tone="accent">Released</Badge>
                    ) : (
                      <Badge tone="neutral">Held until payment</Badge>
                    )}
                  </div>

                  {delivery.credentials_released ? (
                    <div className="mt-3 space-y-2">
                      {credentials.app_url ? (
                        <CredentialRow
                          label="App"
                          value={credentials.app_url}
                          href={credentials.app_url}
                          onCopy={() => copy('App URL', credentials.app_url)}
                        />
                      ) : null}
                      {credentials.admin_url ? (
                        <CredentialRow
                          label="Admin"
                          value={credentials.admin_url}
                          href={credentials.admin_url}
                          onCopy={() => copy('Admin URL', credentials.admin_url)}
                        />
                      ) : null}
                      {credentials.username ? (
                        <CredentialRow
                          label="Username"
                          value={credentials.username}
                          onCopy={() => copy('Username', credentials.username)}
                        />
                      ) : null}
                      {credentials.password ? (
                        <CredentialRow
                          label="Password"
                          value={reveal ? credentials.password : '••••••••••'}
                          onCopy={() => copy('Password', credentials.password)}
                          onToggle={() =>
                            setRevealed((current) => ({
                              ...current,
                              [delivery.id]: !current[delivery.id],
                            }))
                          }
                          revealed={reveal}
                        />
                      ) : null}
                      {credentials.api_key ? (
                        <CredentialRow
                          label="API key"
                          value={reveal ? credentials.api_key : '••••••••••'}
                          onCopy={() => copy('API key', credentials.api_key)}
                        />
                      ) : null}
                      {credentials.notes ? (
                        <p className="pt-1 text-[11px] leading-5 text-slate-500">{credentials.notes}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                      Your live links and login details are released here after the full payment is
                      confirmed.
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={AppWindow}
          title="No apps yet"
          description="Commission a build from any service. You will see the quotation, progress, and credentials in this space."
          action={
            <Button onClick={() => setOpen(true)} disabled={!services.length}>
              <Plus className="h-4 w-4" /> Request a build
            </Button>
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request an app build"
        description="Choose the closest service and describe the outcome you need. We will quote it before work begins."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} loading={saving}>
              Send request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Service"
            value={form.serviceId}
            onChange={(event) => setForm((current) => ({ ...current, serviceId: event.target.value }))}
            options={services.map((service) => ({ value: service.id, label: service.name }))}
          />
          <Input
            label="Project name"
            value={form.projectName}
            onChange={(event) => setForm((current) => ({ ...current, projectName: event.target.value }))}
            placeholder="Skills directory for the youth office"
            maxLength={120}
          />
          <Textarea
            label="What should it do?"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={5}
            maxLength={1500}
            hint="Include the people who will use it, the core workflow, and any deadline."
          />
        </div>
      </Modal>
    </div>
  )
}

function CredentialRow({
  label,
  value,
  href,
  onCopy,
  onToggle,
  revealed,
}: {
  label: string
  value: string
  href?: string
  onCopy: () => void
  onToggle?: () => void
  revealed?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate text-xs text-accent hover:text-accent-light"
          >
            {value} <ArrowUpRight className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <p className="truncate font-mono text-xs text-slate-200">{value}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
