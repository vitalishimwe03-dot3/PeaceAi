import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Check,
  CreditCard,
  Download,
  Info,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import {
  getSubscription,
  listPayments,
  listPlans,
  setSubscriptionCancellation,
  startCheckout,
} from '@/lib/repository'
import { cn, downloadTextFile, formatBytes, formatDate, formatRwf, getErrorMessage } from '@/lib/utils'
import type { Payment, Plan, Subscription } from '@/types/domain'

export function BillingPage() {
  const { user, isPreview } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([listPlans(), getSubscription(user.id), listPayments(user.id)])
      .then(([planRows, subscriptionRow, paymentRows]) => {
        setPlans(planRows.sort((a, b) => a.sort_order - b.sort_order))
        setSubscription(subscriptionRow)
        setPayments(paymentRows)
      })
      .catch((err) => toast({ title: 'Could not load billing', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey])

  const currentPlanId = subscription?.plan_id
  const currentPlan = useMemo(
    () => subscription?.plan ?? plans.find((plan) => plan.slug === 'free') ?? null,
    [subscription, plans],
  )

  const checkoutNotice = useMemo(() => {
    const state = searchParams.get('payment')
    if (!state) return ''
    if (state === 'success' || state === 'completed' || state === 'successful') {
      return 'Your payment provider reported a successful return. Upgrades are activated only after the server verifies the payment webhook, which can take a moment.'
    }
    if (state === 'failed' || state === 'cancelled' || state === 'canceled') {
      return 'Checkout was not completed. Nothing has been charged by PeaceAI. You can try again when ready.'
    }
    return 'Your payment is pending confirmation. Paid features activate only after server-side verification.'
  }, [searchParams])

  const clearNotice = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('payment')
    next.delete('tx_ref')
    next.delete('transaction_id')
    setSearchParams(next, { replace: true })
  }

  if (!user) return null

  const beginCheckout = async (plan: Plan) => {
    if (plan.price_rwf === 0 && period === 'month') {
      toast({ title: 'Free plan', description: 'Contact an administrator to move to the Free plan. Paid features remain active until the paid period ends.', tone: 'info' })
      return
    }
    setCheckoutPlanId(plan.id)
    try {
      const { checkoutUrl } = await startCheckout(plan.id, period)
      window.location.assign(checkoutUrl)
    } catch (err) {
      toast({
        title: 'Checkout is not available',
        description: getErrorMessage(err, 'Configure the payment provider before accepting payments.'),
        tone: 'error',
      })
      setCheckoutPlanId(null)
    }
  }

  const cancelSubscription = async () => {
    setUpdating(true)
    try {
      await setSubscriptionCancellation(user.id, true)
      setRefreshKey((key) => key + 1)
      setCancelOpen(false)
      toast({
        title: 'Cancellation scheduled',
        description: 'Your paid plan remains active until the end of the current billing period. The server verifies the date.',
        tone: 'success',
      })
    } catch (err) {
      toast({ title: 'Could not cancel', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  const resumeSubscription = async () => {
    setUpdating(true)
    try {
      await setSubscriptionCancellation(user.id, false)
      setRefreshKey((key) => key + 1)
      toast({ title: 'Cancellation removed', description: 'Your subscription will renew as normal.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update subscription', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  const downloadReceipt = (payment: Payment) => {
    const plan = plans.find((item) => item.id === payment.plan_id)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>PeaceAI receipt ${payment.id}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;color:#111;padding:0 20px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:8px 0;border-bottom:1px solid #eee;font-size:13px}td:last-child{text-align:right}.muted{color:#666;font-size:12px}</style></head>
<body><h1>PeaceAI payment receipt</h1>
<p class="muted">Receipt ${payment.id}</p>
<table>
<tr><td>Account</td><td>${user.email}</td></tr>
<tr><td>Plan</td><td>${plan?.name ?? 'Subscription payment'}</td></tr>
<tr><td>Amount</td><td>${formatRwf(payment.amount_rwf)} ${payment.currency}</td></tr>
<tr><td>Status</td><td>${payment.status}</td></tr>
<tr><td>Provider reference</td><td>${payment.provider_reference ?? '—'}</td></tr>
<tr><td>Date</td><td>${formatDate(payment.created_at, true)}</td></tr>
</table>
<p class="muted" style="margin-top:32px">This receipt is generated from PeaceAI's payment records. A payment shown as pending is not a completed payment. Keep the payment provider's confirmation for your records.</p>
</body></html>`
    downloadTextFile(`peaceai-receipt-${payment.id}.html`, html, 'text/html')
  }

  return (
    <div>
      <PageHeader
        title="Billing & plans"
        description="Compare plans, manage your subscription, and download payment records. Paid limits are enforced server-side."
        actions={
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
          </Button>
        }
      />

      {checkoutNotice ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.05] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <p className="flex-1 text-xs leading-5 text-sky-100/80">{checkoutNotice}</p>
          <button type="button" onClick={clearNotice} className="text-[11px] text-sky-300 hover:underline">Dismiss</button>
        </div>
      ) : null}

      <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-amber-200"><CreditCard className="h-4 w-4" /> Payment availability</p>
        <p className="mt-1.5 text-[11px] leading-5 text-amber-100/70">
          {isPreview
            ? 'Preview mode: no payment provider is connected. Checkout buttons explain what must be configured and never simulate a charge.'
            : 'Checkout is provided by Flutterwave only when the owner’s merchant credentials are configured in Supabase Edge Function secrets. Card and mobile-money availability is determined by the provider. PeaceAI does not receive or store card numbers.'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading billing" /></div>
      ) : (
        <>
          <section className="card-surface mb-7 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">Current plan</p>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{currentPlan?.name ?? 'Free'}</h2>
                  <Badge tone={statusTone(subscription?.status ?? 'active')}>
                    {subscription?.status ?? 'active'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {subscription
                    ? `${formatRwf(subscription.plan?.price_rwf ?? 0)} / ${subscription.plan?.billing_period ?? 'month'}`
                    : 'No paid subscription. Free-plan limits apply.'}
                </p>
                {subscription?.current_period_end ? (
                  <p className="mt-1 text-[11px] text-slate-600">
                    {subscription.cancel_at_period_end ? 'Access ends' : 'Renews'} {formatDate(subscription.current_period_end)}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-600">Included storage</p>
                <p className="mt-1 text-sm font-medium text-white">{formatBytes(currentPlan?.storage_bytes ?? user.profile.storage_quota_bytes)}</p>
                <p className="mt-1 text-[10px] text-slate-600">
                  {currentPlan ? `${currentPlan.ai_messages_per_day} messages/day · ${currentPlan.ai_requests_per_minute} requests/min` : ''}
                </p>
              </div>
            </div>
            {subscription ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                {subscription.cancel_at_period_end ? (
                  <Button size="sm" variant="outline" onClick={() => void resumeSubscription()} loading={updating}>
                    Keep subscription
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}>Cancel at period end</Button>
                )}
                <p className="self-center text-[10px] text-slate-600">
                  Cancellation never deletes your account. Data-retention rules apply.
                </p>
              </div>
            ) : null}
          </section>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-white">Choose a plan</h2>
              <p className="mt-1 text-[11px] text-slate-500">Paid plans are not unlimited. Fair-use and daily limits are shown.</p>
            </div>
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={cn('rounded-md px-3 py-1.5 text-[11px]', period === 'month' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300')}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPeriod('year')}
                className={cn('rounded-md px-3 py-1.5 text-[11px]', period === 'year' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300')}
              >
                Annual <span className="text-accent">save ~17%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId || (!subscription && plan.slug === 'free')
              const price = period === 'year' ? plan.annual_price_rwf ?? plan.price_rwf * 12 : plan.price_rwf
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'card-surface flex flex-col p-5',
                    isCurrent ? 'border-accent/30 ring-1 ring-accent/15' : '',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-white">{plan.name}</h3>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{plan.description}</p>
                    </div>
                    {isCurrent ? <Badge tone="accent">Current</Badge> : null}
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-semibold text-white">{price === 0 ? 'Free' : formatRwf(price)}</span>
                    {price !== 0 ? <span className="ml-1 text-[11px] text-slate-500">/{period}</span> : null}
                    {period === 'year' && price !== 0 ? <p className="mt-1 text-[10px] text-slate-600">Billed annually</p> : null}
                  </div>
                  <div className="my-4 h-px bg-white/[0.07]" />
                  <ul className="flex-1 space-y-2">
                    {[
                      `${plan.ai_messages_per_day} AI messages per day`,
                      `${plan.ai_requests_per_minute} AI requests per minute`,
                      `${plan.proposal_limit_per_month} project proposals per month`,
                      `${formatBytes(plan.storage_bytes)} private storage`,
                      plan.premium_models ? 'Premium AI models' : 'Standard AI models',
                      ...plan.features,
                    ].map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[11px] leading-5 text-slate-400">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5 w-full"
                    variant={isCurrent ? 'outline' : 'primary'}
                    disabled={isCurrent || checkingOut(plan, checkoutPlanId)}
                    loading={checkoutPlanId === plan.id}
                    onClick={() => void beginCheckout(plan)}
                  >
                    {isCurrent ? 'Current plan' : plan.price_rwf === 0 ? 'Contact support' : <>Choose {plan.name} <ArrowUpRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              )
            })}
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-white">Payment history</h2>
                <p className="mt-1 text-[11px] text-slate-500">Only successful payments grant access. Pending payments are not completed payments.</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-slate-600" />
            </div>
            {payments.length ? (
              <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                <div className="hidden grid-cols-[1fr_130px_120px_130px_90px] gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-600 sm:grid">
                  <span>Reference</span><span>Amount</span><span>Status</span><span>Date</span><span className="text-right">Receipt</span>
                </div>
                {payments.map((payment) => (
                  <div key={payment.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0 sm:grid-cols-[1fr_130px_120px_130px_90px]">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] text-slate-400">{payment.provider_reference || payment.id}</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">{plans.find((plan) => plan.id === payment.plan_id)?.name ?? 'Subscription'}</p>
                    </div>
                    <span className="hidden text-xs text-slate-300 sm:block">{formatRwf(payment.amount_rwf)}</span>
                    <span className="hidden sm:block"><Badge tone={statusTone(payment.status)}>{payment.status}</Badge></span>
                    <span className="hidden text-[11px] text-slate-500 sm:block">{formatDate(payment.created_at)}</span>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => downloadReceipt(payment)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
                        aria-label="Download receipt"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.07] p-8 text-center">
                <ReceiptText className="mx-auto h-6 w-6 text-slate-700" />
                <p className="mt-2 text-xs text-slate-500">No payments yet. Payment records appear here after checkout is configured and used.</p>
              </div>
            )}
          </section>

          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[10px] leading-5 text-slate-500">
            <p className="font-medium text-slate-400">Billing terms</p>
            <p className="mt-1">
              Prices are shown in Rwandan francs (RWF). Subscription activation depends on a verified
              payment webhook; a browser redirect alone never activates a plan. Refund eligibility is described
              in the Refund Policy. Contact support for billing disputes, duplicate charges, or plan changes that
              are not available in this interface.
            </p>
          </div>
        </>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void cancelSubscription()}
        title="Cancel subscription?"
        description="Your paid plan stays active until the current period ends. No further renewal is scheduled. You can keep your subscription instead at any time before the period ends."
        confirmLabel="Cancel at period end"
        destructive
        loading={updating}
      />
    </div>
  )
}

function checkingOut(_plan: Plan, planId: string | null) {
  return planId !== null
}
