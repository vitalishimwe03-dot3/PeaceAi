import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleError, json, preflight, serviceClient } from '../_shared/http.ts'

// Webhook endpoint (verify_jwt=false in config). MUST verify provider signature/hash.
// Entitlements/subscriptions are activated ONLY after verification + idempotent update.
async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  const options = preflight(req)
  if (options) return options
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)
  const admin = serviceClient()
  try {
    const secretHash = Deno.env.get('FLUTTERWAVE_SECRET_HASH')
    if (!secretHash) return json({ error: 'Webhook secret hash not configured.' }, 503)

    // Flutterwave sends verif-hash header (value configured in dashboard).
    const verif = req.headers.get('verif-hash') || ''
    if (!verif || verif !== secretHash) {
      return json({ error: 'Invalid webhook signature.' }, 401)
    }

    const payload = await req.json().catch(() => ({}))
    const txRef = payload?.data?.tx_ref || payload?.txRef || payload?.tx_ref
    const status = String(payload?.data?.status || payload?.status || '').toLowerCase()
    const transactionId = payload?.data?.id ? String(payload.data.id) : null
    if (!txRef) return json({ ok: true, ignored: true })

    const { data: payment } = await admin.from('payments').select('*').eq('provider_reference', txRef).maybeSingle()
    if (!payment) return json({ ok: true, ignored: true })

    // Idempotent: don't regress successful payments.
    if (payment.status === 'successful') return json({ ok: true, idempotent: true })

    const now = new Date().toISOString()
    if (status === 'successful' || status === 'completed') {
      await admin.from('payments').update({
        status: 'successful',
        provider_transaction_id: transactionId,
        raw_payload: payload,
        updated_at: now,
      }).eq('id', payment.id)

      if (payment.plan_id && payment.user_id) {
        // Minimal entitlement activation; adapt to your subscription schema/RPC as needed.
        await admin.from('subscriptions').upsert({
          user_id: payment.user_id,
          plan_id: payment.plan_id,
          status: 'active',
          current_period_start: now,
          cancel_at_period_end: false,
          updated_at: now,
        }, { onConflict: 'user_id' }).catch(() => null)
      }
      return json({ ok: true, verified: true })
    }

    if (status === 'failed' || status === 'cancelled') {
      await admin.from('payments').update({ status: 'failed', raw_payload: payload, updated_at: now }).eq('id', payment.id)
    }
    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
})