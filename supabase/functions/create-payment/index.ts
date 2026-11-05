import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  HttpError,
  handleError,
  json,
  parseJson,
  preflight,
  requireActiveProfile,
  requireUser,
  serviceClient,
} from '../_shared/http.ts'

// Flutterwave Rwanda supports both MTN and Airtel mobile money as an aggregator.
// - paymentMethod "checkout" redirects to Flutterwave's hosted checkout.
// - paymentMethod "mobile_money" calls the direct Rwanda mobile-money charge
//   endpoint, which sends a payment prompt to the customer's phone.
// Verification always happens server-side (payment-webhook + transaction
// verification) before entitlements are activated.

type CreatePaymentBody = {
  planId?: string
  planSlug?: string
  billingPeriod?: 'month' | 'year'
  /** Backwards-compatible alias used by older clients. */
  period?: 'month' | 'year'
  paymentMethod?: 'checkout' | 'mobile_money'
  phoneNumber?: string
  network?: string
}

const FLUTTERWAVE_BASE_URL = Deno.env.get('FLUTTERWAVE_BASE_URL') || 'https://api.flutterwave.com/v3'
const SITE_URL = Deno.env.get('SITE_URL') || Deno.env.get('VITE_SITE_URL') || 'http://localhost:5173'

function normalizeRwandanPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  let national = ''
  if (digits.startsWith('250') && digits.length === 12) {
    national = digits.slice(3)
  } else if (digits.startsWith('0') && digits.length === 10) {
    national = digits.slice(1)
  } else if (digits.length === 9 && digits.startsWith('7')) {
    national = digits
  } else {
    return null
  }
  // Rwandan mobile lines: 072/078/079 (MTN) and 073 (Airtel). Keep the check
  // slightly broader so valid future ranges are not rejected.
  if (!/^7(?:2|3|8|9)\d{7}$/.test(national)) return null
  return `250${national}`
}

function normalizeNetwork(value?: string): 'MTN' | 'AIRTEL' | null {
  const normalized = (value || '').trim().toLowerCase().replace(/[\s_-]/g, '')
  if (normalized === 'mtn' || normalized === 'mtnmomo') return 'MTN'
  if (normalized === 'airtel' || normalized === 'airtelmoney') return 'AIRTEL'
  return null
}

function planQuery(admin: ReturnType<typeof serviceClient>, planKey: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(planKey)
  return admin.from('plans').select('*').eq('active', true).eq(isUuid ? 'id' : 'slug', planKey).maybeSingle()
}

serve(async (req) => {
  const options = preflight(req)
  if (options) return options
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)
  try {
    const { user, admin } = await requireUser(req)
    const profile = await requireActiveProfile(admin, user.id)
    const body = await parseJson<CreatePaymentBody>(req)

    const planKey = (body.planId || body.planSlug || '').trim()
    if (!planKey) throw new HttpError(400, 'planId or planSlug is required.')

    const billingPeriod = body.billingPeriod ?? body.period ?? 'month'
    if (billingPeriod !== 'month' && billingPeriod !== 'year') {
      throw new HttpError(400, 'billingPeriod must be "month" or "year".')
    }

    const paymentMethod = body.paymentMethod ?? 'checkout'
    if (paymentMethod !== 'checkout' && paymentMethod !== 'mobile_money') {
      throw new HttpError(400, 'paymentMethod must be "checkout" or "mobile_money".')
    }

    const { data: plan } = await planQuery(admin, planKey)
    if (!plan) throw new HttpError(404, 'Plan not found.')

    const amount = billingPeriod === 'year' && plan.annual_price_rwf ? plan.annual_price_rwf : plan.price_rwf
    if (!amount || amount <= 0) throw new HttpError(400, 'This plan does not require checkout for the selected period.')

    const network = normalizeNetwork(body.network)
    const txRef = `peaceai-${user.id}-${crypto.randomUUID()}`
    const { data: payment, error: payErr } = await admin
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_rwf: amount,
        currency: 'RWF',
        provider: 'flutterwave',
        provider_reference: txRef,
        status: 'pending',
        metadata: {
          period: billingPeriod,
          billing_period: billingPeriod,
          payment_method: paymentMethod,
          network,
        },
      })
      .select('id')
      .single()
    if (payErr) throw payErr

    const secret = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
    if (!secret) {
      await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', payment.id)
      throw new HttpError(503, 'Payments provider is not configured. Set FLUTTERWAVE_SECRET_KEY and related secrets.')
    }

    const baseUrl = FLUTTERWAVE_BASE_URL.replace(/\/+$/, '')
    const siteUrl = SITE_URL.replace(/\/+$/, '')

    if (paymentMethod === 'mobile_money') {
      const phoneNumber = normalizeRwandanPhone(body.phoneNumber || '')
      if (!phoneNumber) {
        await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', payment.id)
        throw new HttpError(400, 'Enter a valid Rwandan MTN or Airtel Money number, for example 0781234567 or +250781234567.')
      }

      const res = await fetch(`${baseUrl}/charges?type=mobile_money_rwanda`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          amount,
          currency: 'RWF',
          email: user.email,
          tx_ref: txRef,
          fullname: profile.full_name ?? undefined,
          meta: {
            user_id: user.id,
            plan_id: plan.id,
            payment_id: payment.id,
            billing_period: billingPeriod,
            network,
          },
        }),
      })
      const payload = await res.json().catch(() => ({}))
      const authorization = payload?.meta?.authorization
      const redirect = typeof authorization?.redirect === 'string' ? authorization.redirect : null
      const mode = typeof authorization?.mode === 'string' ? authorization.mode : null
      const ok = res.ok && String(payload?.status || payload?.data?.status || '').toLowerCase() === 'success'
      if (!ok) {
        await admin
          .from('payments')
          .update({
            status: 'failed',
            raw_payload: payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
        throw new HttpError(502, payload?.message || 'The payment provider could not send the mobile-money prompt.')
      }

      await admin
        .from('payments')
        .update({
          raw_payload: payload,
          metadata: {
            period: billingPeriod,
            billing_period: billingPeriod,
            payment_method: paymentMethod,
            network,
            phone_number: phoneNumber,
            provider_status: payload?.status ?? payload?.data?.status ?? null,
            provider_reference: payload?.data?.flw_ref ?? null,
            authorization_mode: mode,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)

      return json({
        paymentId: payment.id,
        txRef,
        status: 'pending',
        message: redirect
          ? 'Redirecting to the payment confirmation page.'
          : 'A payment request has been sent to your phone. Approve it with your mobile-money PIN.',
        authorizationUrl: redirect,
        mode,
      })
    }

    const res = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: 'RWF',
        redirect_url: `${siteUrl}/app/billing?payment=pending&tx_ref=${encodeURIComponent(txRef)}`,
        customer: { email: user.email },
        meta: { user_id: user.id, plan_id: plan.id, payment_id: payment.id, billing_period: billingPeriod },
        customizations: { title: 'PeaceAI', description: `${plan.name} plan` },
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok || !payload?.data?.link) {
      await admin
        .from('payments')
        .update({ status: 'failed', raw_payload: payload, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
      throw new HttpError(502, 'Payment provider could not create a checkout session.')
    }
    await admin
      .from('payments')
      .update({ raw_payload: payload, updated_at: new Date().toISOString() })
      .eq('id', payment.id)
    return json({ checkoutUrl: payload.data.link, txRef })
  } catch (error) {
    return handleError(error)
  }
})
