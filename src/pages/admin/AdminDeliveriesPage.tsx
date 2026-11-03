import { useEffect, useState } from 'react'
import { KeyRound, PackageCheck, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import {
  listAllAppDeliveries,
  recordAuditEvent,
  updateAppDelivery,
} from '@/lib/repository'
import { formatDate, formatRwf, getErrorMessage } from '@/lib/utils'
import type { AppCredentials, AppDelivery, DeliveryPaymentStatus, DeliveryStatus } from '@/types/domain'

const deliveryTone: Record<DeliveryStatus, 'neutral' | 'blue' | 'accent' | 'amber' | 'violet'> = {
  requested: 'neutral',
  building: 'blue',
  ready: 'amber',
  delivered: 'accent',
  live: 'violet',
}

const paymentTone: Record<DeliveryPaymentStatus, 'neutral' | 'amber' | 'accent' | 'rose'> = {
  unpaid: 'rose',
  pending: 'amber',
  paid: 'accent',
  refunded: 'neutral',
}

const emptyCredentials: AppCredentials = {
  app_url: null,
  admin_url: null,
  username: null,
  password: null,
  api_key: null,
  notes: null,
}

interface FormState {
  project_name: string
  description: string
  status: DeliveryStatus
  price_rwf: string
  payment_status: DeliveryPaymentStatus
  admin_notes: string
  credentials_released: boolean
  credentials: AppCredentials
}

export function AdminDeliveriesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<AppDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AppDelivery | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    listAllAppDeliveries()
      .then(setDeliveries)
      .catch((err) =>
        toast({ title: 'Could not load app deliveries', description: getErrorMessage(err), tone: 'error' }),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = (delivery: AppDelivery) => {
    const credentials = { ...emptyCredentials, ...delivery.credentials }
    setSelected(delivery)
    setForm({
      project_name: delivery.project_name,
      description: delivery.description,
      status: delivery.status,
      price_rwf: String(delivery.price_rwf),
      payment_status: delivery.payment_status,
      admin_notes: delivery.admin_notes ?? '',
      credentials_released: delivery.credentials_released,
      credentials,
    })
  }

  const close = () => {
    setSelected(null)
    setForm(null)
  }

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const patchCredential = <K extends keyof AppCredentials>(key: K, value: string) => {
    setForm((current) =>
      current
        ? {
            ...current,
            credentials: {
              ...current.credentials,
              [key]: value.trim() ? value.trim() : null,
            },
          }
        : current,
    )
  }

  const save = async () => {
    if (!selected || !form || !user) return
    setSaving(true)
    try {
      const deliveredAt =
        selected.delivered_at ??
        (form.status === 'delivered' || form.status === 'live'
          ? new Date().toISOString()
          : null)
      await updateAppDelivery(selected.id, {
        project_name: form.project_name.trim(),
        description: form.description.trim(),
        status: form.status,
        price_rwf: Math.max(0, Math.round(Number(form.price_rwf) || 0)),
        payment_status: form.payment_status,
        admin_notes: form.admin_notes.trim() || null,
        credentials: form.credentials,
        credentials_released: form.credentials_released,
        delivered_at: deliveredAt,
      })
      await recordAuditEvent(user.id, 'admin.app_delivery_updated', 'info', {
        delivery_id: selected.id,
        status: form.status,
        payment_status: form.payment_status,
        credentials_released: form.credentials_released,
      })
      toast({ title: 'Delivery updated', description: 'The customer will see the latest status.', tone: 'success' })
      close()
      load()
    } catch (err) {
      toast({ title: 'Could not update delivery', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const release = async () => {
    if (!selected || !form || !user) return
    if (form.payment_status !== 'paid') {
      toast({
        title: 'Payment required',
        description: 'Mark the payment as paid before releasing app credentials.',
        tone: 'error',
      })
      return
    }
    setSaving(true)
    try {
      await updateAppDelivery(selected.id, {
        credentials: form.credentials,
        credentials_released: true,
        status: 'delivered',
        payment_status: form.payment_status,
        price_rwf: Math.max(0, Math.round(Number(form.price_rwf) || 0)),
        admin_notes: form.admin_notes.trim() || null,
        delivered_at: selected.delivered_at ?? new Date().toISOString(),
      })
      await recordAuditEvent(user.id, 'admin.app_credentials_released', 'warning', {
        delivery_id: selected.id,
      })
      toast({
        title: 'Credentials released',
        description: 'The customer can now open the app and administration links.',
        tone: 'success',
      })
      close()
      load()
    } catch (err) {
      toast({ title: 'Could not release credentials', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="App deliveries"
        description="Track commissioned builds, confirm payment, and release credentials only after the balance is settled."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Loading app deliveries" />
        </div>
      ) : deliveries.length ? (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Credentials</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr
                    key={delivery.id}
                    className="cursor-pointer border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]"
                    onClick={() => open(delivery)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{delivery.project_name}</p>
                      <p className="text-[11px] text-slate-500">{delivery.service?.name ?? 'Service'}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-300">
                      <p>{delivery.profile?.full_name || 'Unnamed customer'}</p>
                      <p className="text-[11px] text-slate-500">{delivery.profile?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={deliveryTone[delivery.status]}>{delivery.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={paymentTone[delivery.payment_status]}>
                        {delivery.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-300">
                      {formatRwf(delivery.price_rwf)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={delivery.credentials_released ? 'accent' : 'neutral'}>
                        {delivery.credentials_released ? 'Released' : 'Held'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {formatDate(delivery.requested_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={PackageCheck}
          title="No app deliveries yet"
          description="When a customer commissions a build, it will appear here for review, pricing, and credential release."
        />
      )}

      <Modal
        open={Boolean(selected && form)}
        onClose={close}
        title={selected ? selected.project_name : 'App delivery'}
        description="Confirm the payment, then release the live app and administration credentials."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => void release()}
              loading={saving}
              disabled={!form || form.payment_status !== 'paid' || form.credentials_released}
            >
              <KeyRound className="h-4 w-4" /> Release credentials
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <Input
              label="Project name"
              value={form.project_name}
              onChange={(event) => patch('project_name', event.target.value)}
              maxLength={120}
            />
            <Textarea
              label="Brief"
              value={form.description}
              onChange={(event) => patch('description', event.target.value)}
              rows={3}
              maxLength={1000}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Build status"
                value={form.status}
                onChange={(event) => patch('status', event.target.value as DeliveryStatus)}
                options={[
                  { value: 'requested', label: 'Requested' },
                  { value: 'building', label: 'Building' },
                  { value: 'ready', label: 'Ready for review' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'live', label: 'Live' },
                ]}
              />
              <Select
                label="Payment status"
                value={form.payment_status}
                onChange={(event) =>
                  patch('payment_status', event.target.value as DeliveryPaymentStatus)
                }
                options={[
                  { value: 'unpaid', label: 'Unpaid' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'refunded', label: 'Refunded' },
                ]}
              />
              <Input
                label="Agreed price (RWF)"
                type="number"
                min={0}
                value={form.price_rwf}
                onChange={(event) => patch('price_rwf', event.target.value)}
                hint="Set the quotation total before the customer pays."
              />
              <Input
                label="Delivered at"
                value={selected?.delivered_at ? formatDate(selected.delivered_at, true) : 'Not delivered'}
                readOnly
                disabled
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-ink-950/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                Release credentials
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                These values are visible to the customer only after you release them and payment is
                marked as paid.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="App URL"
                  value={form.credentials.app_url ?? ''}
                  onChange={(event) => patchCredential('app_url', event.target.value)}
                  placeholder="https://app.example.com"
                />
                <Input
                  label="Admin URL"
                  value={form.credentials.admin_url ?? ''}
                  onChange={(event) => patchCredential('admin_url', event.target.value)}
                  placeholder="https://app.example.com/admin"
                />
                <Input
                  label="Username"
                  value={form.credentials.username ?? ''}
                  onChange={(event) => patchCredential('username', event.target.value)}
                  autoComplete="off"
                />
                <Input
                  label="Password"
                  value={form.credentials.password ?? ''}
                  onChange={(event) => patchCredential('password', event.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  label="API key"
                  value={form.credentials.api_key ?? ''}
                  onChange={(event) => patchCredential('api_key', event.target.value)}
                  autoComplete="off"
                  containerClassName="sm:col-span-2"
                />
                <Textarea
                  label="Handover notes"
                  value={form.credentials.notes ?? ''}
                  onChange={(event) => patchCredential('notes', event.target.value)}
                  rows={2}
                  maxLength={500}
                  containerClassName="sm:col-span-2"
                />
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={form.credentials_released}
                  onChange={(event) => patch('credentials_released', event.target.checked)}
                  className="accent-orange-400"
                />
                Credentials have been released to the customer
              </label>
            </div>

            <Textarea
              label="Internal notes"
              value={form.admin_notes}
              onChange={(event) => patch('admin_notes', event.target.value)}
              rows={2}
              maxLength={600}
              hint="Visible to the customer as delivery notes."
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
