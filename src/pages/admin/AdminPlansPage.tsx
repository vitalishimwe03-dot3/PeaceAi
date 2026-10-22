import { useEffect, useState } from 'react'
import { CreditCard, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { listAllPlans, recordAuditEvent, updateAdminPlan } from '@/lib/repository'
import { formatBytes, formatRwf, getErrorMessage } from '@/lib/utils'
import type { Plan } from '@/types/domain'

const GIB = 1024 * 1024 * 1024

export function AdminPlansPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [monthly, setMonthly] = useState('')
  const [annual, setAnnual] = useState('')
  const [messages, setMessages] = useState('')
  const [perMinute, setPerMinute] = useState('')
  const [proposals, setProposals] = useState('')
  const [storageGib, setStorageGib] = useState('')
  const [features, setFeatures] = useState('')
  const [premium, setPremium] = useState(false)
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listAllPlans()
      .then((rows) => setPlans(rows.sort((a, b) => a.sort_order - b.sort_order)))
      .catch((err) => toast({ title: 'Could not load plans', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = (plan: Plan) => {
    setEditPlan(plan)
    setName(plan.name)
    setDescription(plan.description)
    setMonthly(String(plan.price_rwf))
    setAnnual(plan.annual_price_rwf != null ? String(plan.annual_price_rwf) : '')
    setMessages(String(plan.ai_messages_per_day))
    setPerMinute(String(plan.ai_requests_per_minute))
    setProposals(String(plan.proposal_limit_per_month))
    setStorageGib((plan.storage_bytes / GIB).toFixed(2).replace(/\.?0+$/, ''))
    setFeatures(plan.features.join('\n'))
    setPremium(plan.premium_models)
    setActive(plan.active)
  }

  const save = async () => {
    if (!user || !editPlan) return
    const storage = Number(storageGib)
    if (!Number.isFinite(storage) || storage < 0.1) {
      toast({ title: 'Invalid storage amount', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const patch: Partial<Plan> = {
        name: name.trim(),
        description: description.trim(),
        price_rwf: Number(monthly) || 0,
        annual_price_rwf: annual === '' ? null : Number(annual),
        ai_messages_per_day: Number(messages) || 0,
        ai_requests_per_minute: Number(perMinute) || 0,
        proposal_limit_per_month: Number(proposals) || 0,
        storage_bytes: Math.round(storage * GIB),
        features: features.split('\n').map((line) => line.trim()).filter(Boolean),
        premium_models: premium,
        active,
      }
      await updateAdminPlan(editPlan.id, patch)
      setPlans((current) => current.map((plan) => plan.id === editPlan.id ? { ...plan, ...patch } : plan))
      await recordAuditEvent(user.id, 'admin.plan_updated', 'warning', {
        plan_id: editPlan.id,
        price_rwf: patch.price_rwf,
        active,
      })
      setEditPlan(null)
      toast({ title: 'Plan updated', description: 'Existing subscriptions may keep their current billing terms until renewal. Verify before changing live prices.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update plan', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Configure pricing, limits, storage, and features. Limits are enforced server-side and shown to members."
        actions={<Badge tone="neutral">{plans.filter((plan) => plan.active).length} active</Badge>}
      />

      <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 text-[11px] leading-5 text-amber-100/70">
        Prices are in Rwandan francs. Changing a plan price does not retroactively charge existing subscribers.
        Payment-provider plan identifiers and webhook verification must be validated separately before enabling a paid plan.
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading plans" /></div>
      ) : plans.length ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="card-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-600">{plan.slug}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone={plan.active ? 'accent' : 'neutral'}>{plan.active ? 'Active' : 'Hidden'}</Badge>
                  <button type="button" onClick={() => openEdit(plan)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Edit ${plan.name}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xl font-semibold text-white">{plan.price_rwf === 0 ? 'Free' : formatRwf(plan.price_rwf)}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">per month{plan.annual_price_rwf != null ? ` · ${formatRwf(plan.annual_price_rwf)} per year` : ''}</p>
              <dl className="mt-4 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex justify-between gap-2"><dt>Messages/day</dt><dd className="text-slate-300">{plan.ai_messages_per_day}</dd></div>
                <div className="flex justify-between gap-2"><dt>Requests/minute</dt><dd className="text-slate-300">{plan.ai_requests_per_minute}</dd></div>
                <div className="flex justify-between gap-2"><dt>Proposals/month</dt><dd className="text-slate-300">{plan.proposal_limit_per_month}</dd></div>
                <div className="flex justify-between gap-2"><dt>Storage</dt><dd className="text-slate-300">{formatBytes(plan.storage_bytes)}</dd></div>
                <div className="flex justify-between gap-2"><dt>Premium models</dt><dd className="text-slate-300">{plan.premium_models ? 'Yes' : 'No'}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={CreditCard} title="No plans configured" description="Seed the plans table before accepting subscriptions." />
      )}

      <Modal
        open={Boolean(editPlan)}
        onClose={() => { if (!saving) setEditPlan(null) }}
        title="Edit plan"
        description={editPlan?.slug}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditPlan(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} loading={saving} disabled={!name.trim()}>Save plan</Button>
          </>
        }
      >
        {editPlan ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Plan name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
              <Input label="Storage (GiB)" type="number" min={0.1} step={0.5} value={storageGib} onChange={(event) => setStorageGib(event.target.value)} />
            </div>
            <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={240} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Monthly price (RWF)" type="number" min={0} value={monthly} onChange={(event) => setMonthly(event.target.value)} />
              <Input label="Annual price (RWF)" type="number" min={0} value={annual} onChange={(event) => setAnnual(event.target.value)} hint="Leave blank to use monthly × 12 in the UI." />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Messages/day" type="number" min={0} value={messages} onChange={(event) => setMessages(event.target.value)} />
              <Input label="Requests/minute" type="number" min={0} value={perMinute} onChange={(event) => setPerMinute(event.target.value)} />
              <Input label="Proposals/month" type="number" min={0} value={proposals} onChange={(event) => setProposals(event.target.value)} />
            </div>
            <Textarea label="Additional features (one per line)" value={features} onChange={(event) => setFeatures(event.target.value)} rows={4} />
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                <input type="checkbox" checked={premium} onChange={(event) => setPremium(event.target.checked)} className="accent-violet-400" />
                Includes premium models
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="accent-emerald-400" />
                Plan is active and visible
              </label>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
