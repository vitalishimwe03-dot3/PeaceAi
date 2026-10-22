import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, HelpCircle, Minus, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHero, SectionHeading } from '@/components/marketing/PageHero'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { listPlans } from '@/lib/repository'
import { fallbackPlans } from '@/lib/catalog'
import { invokeFunction } from '@/lib/supabase'
import { cn, formatRwf, getErrorMessage } from '@/lib/utils'
import type { Plan } from '@/types/domain'

export function PricingPage() {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans)
  const [busy, setBusy] = useState<string | null>(null)
  const { user, configured } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    void listPlans().then(setPlans).catch(() => undefined)
  }, [])

  const choosePlan = async (plan: Plan) => {
    if (!user) {
      navigate(`/signup?next=/pricing&plan=${plan.slug}`)
      return
    }
    if (plan.price_rwf === 0) {
      navigate('/app/billing')
      return
    }
    if (!configured) {
      toast({
        title: 'Payments are not configured',
        description: 'Connect Supabase and a tested Flutterwave merchant account before enabling checkout. No charge was made.',
        tone: 'error',
      })
      return
    }
    setBusy(plan.id)
    try {
      const result = await invokeFunction<{ checkoutUrl?: string; error?: string; message?: string }>(
        'create-payment',
        { planSlug: plan.slug, billingPeriod: period === 'annual' ? 'year' : 'month' },
      )
      if (!result.checkoutUrl) {
        throw new Error(result.message || result.error || 'The payment provider did not return a checkout URL.')
      }
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      toast({ title: 'Checkout could not start', description: getErrorMessage(error), tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={<>Plans that scale with the work.</>}
        description="Start free, then upgrade for higher AI allowances and advanced project features. Paid plans are never unlimited, and every limit is enforced on the server."
      >
        <div className="mt-8 inline-flex rounded-xl border border-white/10 bg-ink-900/70 p-1" role="group" aria-label="Billing period">
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              period === 'monthly' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
            )}
            aria-pressed={period === 'monthly'}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('annual')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              period === 'annual' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
            )}
            aria-pressed={period === 'annual'}
          >
            Annual <span className="ml-1 text-[10px] text-accent">2 months free</span>
          </button>
        </div>
      </PageHero>

      <section className="container-page py-14">
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.slug === 'pro'
            const amount =
              period === 'annual' && plan.annual_price_rwf != null ? plan.annual_price_rwf : plan.price_rwf
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-6',
                  featured
                    ? 'border-accent/35 bg-gradient-to-b from-accent/[0.08] to-ink-900 shadow-glow'
                    : 'border-white/[0.08] bg-ink-900/60',
                )}
              >
                {featured ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                    Recommended
                  </span>
                ) : null}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  {plan.premium_models ? <Badge tone="violet">Premium models</Badge> : null}
                </div>
                <p className="mt-2 min-h-10 text-sm text-slate-400">{plan.description}</p>
                <div className="mt-6">
                  <span className="font-display text-4xl font-semibold text-white">{formatRwf(amount)}</span>
                  <span className="text-sm text-slate-500">/{period === 'annual' ? 'year' : 'month'}</span>
                  {period === 'annual' && plan.price_rwf > 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Equivalent to {formatRwf(Math.round(amount / 12))}/month, billed annually
                    </p>
                  ) : null}
                </div>
                <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-xs text-slate-400">
                  <p><strong className="text-white">{plan.ai_messages_per_day}</strong> AI messages/day</p>
                  <p className="mt-1"><strong className="text-white">{plan.ai_requests_per_minute}</strong> requests/minute</p>
                  <p className="mt-1"><strong className="text-white">{Math.round(plan.storage_bytes / (1024 ** 3))} GiB</strong> included storage</p>
                  <p className="mt-1"><strong className="text-white">{plan.proposal_limit_per_month}</strong> proposals/month</p>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={featured ? 'primary' : 'outline'}
                  className="mt-6 w-full"
                  onClick={() => void choosePlan(plan)}
                  loading={busy === plan.id}
                >
                  {plan.price_rwf === 0 ? (user ? 'Current free plan' : 'Start free') : user ? `Choose ${plan.name}` : `Start with ${plan.name}`}
                </Button>
                <p className="mt-2 text-center text-[10px] text-slate-500">
                  {plan.price_rwf === 0
                    ? 'No card required'
                    : configured
                      ? 'Secure checkout via configured provider'
                      : 'Checkout requires payment configuration'}
                </p>
              </div>
            )
          })}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Prices are proposed launch prices in Rwandan francs (RWF) and may be configured by an administrator.
          Subscriptions renew until cancelled. Plan changes take effect at the start of the next billing period unless
          otherwise stated in the checkout flow.
        </p>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-16">
        <div className="container-page">
          <SectionHeading
            eyebrow="Compare"
            title="The details that affect cost."
            description="AI usage consumes real provider capacity. Limits protect both your budget and platform reliability."
          />
          <div className="mt-10 overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="px-5 py-4 font-medium">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[
                  ['Monthly price', (plan: Plan) => formatRwf(plan.price_rwf)],
                  ['AI messages / day', (plan: Plan) => String(plan.ai_messages_per_day)],
                  ['Requests / minute', (plan: Plan) => String(plan.ai_requests_per_minute)],
                  ['Included storage', (plan: Plan) => `${Math.round(plan.storage_bytes / (1024 ** 3))} GiB`],
                  ['Project proposals / month', (plan: Plan) => String(plan.proposal_limit_per_month)],
                  ['Premium models', (plan: Plan) => (plan.premium_models ? 'Yes' : '—')],
                  ['Collaboration', (plan: Plan) => (plan.slug === 'free' ? 'Basic' : 'Expanded')],
                  ['Priority processing', (plan: Plan) => (plan.slug === 'free' ? 'Standard' : 'Higher where available')],
                ].map(([label, formatter]) => (
                  <tr key={label as string} className="text-slate-300">
                    <td className="px-5 py-3.5 font-medium text-white">{label as string}</td>
                    {plans.map((plan) => {
                      const value = (formatter as (plan: Plan) => string)(plan)
                      return (
                        <td key={plan.id} className="px-5 py-3.5">
                          {value === '—' || value === 'No' ? (
                            <Minus className="h-4 w-4 text-slate-600" aria-label={value === '—' ? 'Not included' : value} />
                          ) : value === 'Yes' ? (
                            <Check className="h-4 w-4 text-accent" aria-label="Included" />
                          ) : (
                            value
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'No unlimited AI claims',
              text: 'Every plan has a server-enforced message allowance. When a limit is reached, the interface shows when it resets and which plan offers more.',
            },
            {
              icon: HelpCircle,
              title: 'Clear plan changes',
              text: 'Upgrades, downgrades, and cancellations are confirmed server-side. Access changes according to the billing period shown at checkout.',
            },
            {
              icon: Check,
              title: 'Verified payments only',
              text: 'Paid features activate after a verified webhook, never because a browser returned to a success page.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <item.icon className="h-5 w-5 text-accent" />
              <h2 className="mt-3 text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/legal/refunds" className={buttonStyles({ variant: 'ghost' })}>
            Subscription and Refund Policy
          </Link>
          <Link to="/contact" className={buttonStyles({ variant: 'outline' })}>
            Ask about a plan
          </Link>
        </div>
      </section>
    </>
  )
}
