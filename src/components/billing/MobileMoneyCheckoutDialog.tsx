import { useEffect, useMemo, useState } from 'react'
import { Smartphone, ShieldCheck, Wallet } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn, formatRwf } from '@/lib/utils'
import { detectMobileMoneyNetwork, normalizeRwandanPhone, type MobileMoneyNetwork } from '@/lib/mobile-money'
import type { Plan } from '@/types/domain'

export type MobileMoneyCheckoutSubmit =
  | { paymentMethod: 'mobile_money'; phoneNumber: string; network: MobileMoneyNetwork }
  | { paymentMethod: 'checkout' }

interface MobileMoneyCheckoutDialogProps {
  open: boolean
  onClose: () => void
  plan: Plan | null
  period: 'month' | 'year'
  busy: boolean
  onSubmit: (details: MobileMoneyCheckoutSubmit) => void | Promise<void>
}

export function MobileMoneyCheckoutDialog({
  open,
  onClose,
  plan,
  period,
  busy,
  onSubmit,
}: MobileMoneyCheckoutDialogProps) {
  const [phone, setPhone] = useState('')
  const [network, setNetwork] = useState<MobileMoneyNetwork>('MTN')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setPhone('')
    setNetwork('MTN')
    setTouched(false)
  }, [open, plan?.id])

  const normalizedPhone = normalizeRwandanPhone(phone)
  const detectedNetwork = detectMobileMoneyNetwork(phone)
  const valid = normalizedPhone !== null
  const error = touched && phone.trim() && !valid ? 'Enter a valid Rwandan MTN or Airtel Money number.' : ''

  const amount = useMemo(() => {
    if (!plan) return 0
    return period === 'year' ? plan.annual_price_rwf ?? plan.price_rwf * 12 : plan.price_rwf
  }, [plan, period])

  useEffect(() => {
    if (detectedNetwork) setNetwork(detectedNetwork)
  }, [detectedNetwork])

  const submitMobileMoney = () => {
    setTouched(true)
    if (!normalizedPhone || !plan) return
    void onSubmit({ paymentMethod: 'mobile_money', phoneNumber: normalizedPhone, network })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pay with Mobile Money"
      description="Approve the payment prompt on your phone. Your plan activates only after the payment is verified."
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => void onSubmit({ paymentMethod: 'checkout' })} disabled={busy}>
            Use secure checkout page
          </Button>
          <Button size="sm" onClick={submitMobileMoney} loading={busy} disabled={!valid}>
            Send payment prompt
          </Button>
        </>
      }
    >
      {plan ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-sunken p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">Plan</p>
                <p className="mt-1 text-sm font-semibold text-content-strong">{plan.name}</p>
                <p className="text-[11px] text-content-muted">Billed {period === 'year' ? 'annually' : 'monthly'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-600">Amount</p>
                <p className="mt-1 text-lg font-semibold text-content-strong">{formatRwf(amount)}</p>
              </div>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-slate-200">Network</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mobile money network">
              {([
                { value: 'MTN', label: 'MTN MoMo', hint: '072 · 078 · 079' },
                { value: 'AIRTEL', label: 'Airtel Money', hint: '073' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={network === option.value}
                  onClick={() => setNetwork(option.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors focus-ring',
                    network === option.value
                      ? 'border-accent/50 bg-accent/10 text-content-strong'
                      : 'border-line bg-surface-sunken text-content-muted hover:border-line-strong hover:text-content-strong',
                  )}
                >
                  <span className="block text-xs font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{option.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="mobile-money-phone" className="mb-1.5 block text-sm font-medium text-slate-200">
              Mobile money number
            </label>
            <input
              id="mobile-money-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="0781 234 567"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setTouched(true)
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'mobile-money-phone-error' : 'mobile-money-phone-hint'}
              className={cn(
                'w-full rounded-xl border border-line bg-surface-sunken px-3.5 py-2.5 text-sm text-content-strong placeholder:text-content-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20',
                error && 'border-rose-500/60',
              )}
            />
            {error ? (
              <p id="mobile-money-phone-error" className="mt-1.5 text-xs text-rose-400" role="alert">
                {error}
              </p>
            ) : (
              <p id="mobile-money-phone-hint" className="mt-1.5 text-xs text-slate-500">
                We send the prompt to this number. Do not enter your wallet PIN here.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3 text-[11px] leading-5 text-emerald-100/80">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <p>
              PeaceAI never sees your mobile-money PIN. The payment is processed by the provider and the plan is
              activated only after a verified webhook.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-600">
            <Wallet className="h-3.5 w-3.5" /> MTN MoMo and Airtel Money via Flutterwave
            <Smartphone className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
          </div>
        </div>
      ) : (
        <p className="text-sm text-content-muted">No plan selected.</p>
      )}
    </Modal>
  )
}
