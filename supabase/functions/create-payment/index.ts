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

// Scaffold: integrates with Flutterwave when secrets are configured.
// This endpoint must NOT trust client amounts/plans without server verification.
serve(async (req) => {
  const options = preflight(req)
  if (options) return options
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)
  try {
    const { user, admin } = await requireUser(req)
    await requireActiveProfile(admin, user.id)
    const body = await parseJson<{ planId?: string; billingPeriod?: 'month' | 'year' }>(req)
    const planId = (body.planId || '').trim()
    if (!planId) throw new HttpError(400, 'planId is required.')

    const { data: plan } = await admin.from('plans').select('*').eq('id', planId).eq('active', true).maybeSingle()
    if (!plan) throw new HttpError(404, 'Plan not found.')

    const secret = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
    const baseUrl = Deno.env.get('FLUTTERWAVE_BASE_URL') || 'https://api.flutterwave.com/v3'
    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('VITE_SITE_URL') || 'http://localhost:5173'
    if (!secret) {
      throw new HttpError(503, 'Payments provider is not configured. Set FLUTTERWAVE_SECRET_KEY and related secrets.')
    }

    const amount = body.billingPeriod === 'year' && plan.annual_price_rwf ? plan.annual_price_rwf : plan.price_rwf
    if (!amount || amount <= 0) throw new HttpError(400, 'This plan does not require checkout for the selected period.')

    const txRef = `peaceai-${user.id}-${crypto.randomUUID()}`
    const { data: payment, error: payErr } = await admin.from('payments').insert({
      user_id: user.id,
      plan_id: plan.id,
      amount_rwf: amount,
      currency: 'RWF',
      provider: 'flutterwave',
      provider_reference: txRef,
      status: 'pending',
      metadata: { billing_period: body.billingPeriod ?? 'month' },
    }).select('id').single()
    if (payErr) throw payErr

    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: 'RWF',
        redirect_url: `${siteUrl.replace(/\/+$/, '')}/app/billing?payment=pending&tx_ref=${encodeURIComponent(txRef)}`,
        customer: { email: user.email },
        meta: { user_id: user.id, plan_id: plan.id, payment_id: payment.id, billing_period: body.billingPeriod ?? 'month' },
        customizations: { title: 'PeaceAI', description: `${plan.name} plan` },
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok || !payload?.data?.link) {
      await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', payment.id)
      throw new HttpError(502, 'Payment provider could not create a checkout session.')
    }
    return json({ checkoutUrl: payload.data.link, txRef })
  } catch (error) {
    return handleError(error)
  }
})