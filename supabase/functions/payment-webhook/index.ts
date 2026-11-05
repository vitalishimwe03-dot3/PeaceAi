import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleError, json, preflight, serviceClient } from '../_shared/http.ts'

// Flutterwave webhook endpoint (verify_jwt=false in config). It verifies the
// provider signature, verifies the transaction with Flutterwave again, and
// only then calls the server-side activate_paid_subscription RPC.
async function verifyFlutterwaveTransaction(
  baseUrl: string,
  secretKey: string,
  transactionId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((payload as { message?: string })?.message || 'Flutterwave verification request failed.')
  }
  return payload as Record<string, unknown>
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

    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .select('*')
      .eq('provider_reference', txRef)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) return json({ ok: true, ignored: true })

    // Idempotent: don't regress successful payments.
    if (payment.status === 'successful') return json({ ok: true, idempotent: true })

    const now = new Date().toISOString()
    const baseUrl = (Deno.env.get('FLUTTERWAVE_BASE_URL') || 'https://api.flutterwave.com/v3').replace(/\/+$/, '')

    if (status === 'successful' || status === 'completed') {
      const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
      if (!secretKey) {
        return json({ error: 'Payment provider secret key is not configured.' }, 503)
      }
      if (!transactionId) {
        await admin
          .from('payments')
          .update({
            raw_payload: payload,
            updated_at: now,
            metadata: { ...(payment.metadata ?? {}), verification_error: 'missing_transaction_id' },
          })
          .eq('id', payment.id)
        return json({ ok: true, verified: false, reason: 'missing_transaction_id' })
      }

      let verifyPayload: Record<string, unknown>
      try {
        verifyPayload = await verifyFlutterwaveTransaction(baseUrl, secretKey, transactionId)
      } catch (error) {
        console.error('Flutterwave transaction verification failed', error)
        // Ask Flutterwave to retry the webhook; do not activate the plan.
        return json({ error: 'Could not verify transaction with the payment provider.' }, 503)
      }

      const verified = (verifyPayload.data ?? {}) as Record<string, unknown>
      const verifiedAmount = Number(verified.amount ?? verified.charged_amount ?? 0)
      const verifiedCurrency = String(verified.currency ?? '').toUpperCase()
      const verifiedTxRef = String(verified.tx_ref ?? '')
      const verifiedStatus = String(verified.status ?? '').toLowerCase()

      if (
        String(verifyPayload.status ?? '').toLowerCase() !== 'success' ||
        verifiedStatus !== 'successful' ||
        verifiedTxRef !== txRef ||
        verifiedCurrency !== 'RWF' ||
        verifiedAmount !== Number(payment.amount_rwf)
      ) {
        await admin
          .from('payments')
          .update({
            status: 'failed',
            provider_transaction_id: transactionId,
            raw_payload: payload,
            updated_at: now,
            metadata: {
              ...(payment.metadata ?? {}),
              verification_failed: {
                status: verifiedStatus,
                amount: verifiedAmount,
                currency: verifiedCurrency,
                tx_ref: verifiedTxRef,
              },
            },
          })
          .eq('id', payment.id)
        return json({ ok: true, verified: false })
      }

      await admin
        .from('payments')
        .update({
          provider_transaction_id: transactionId,
          raw_payload: payload,
          updated_at: now,
          metadata: { ...(payment.metadata ?? {}), webhook_event: payload?.event ?? null },
        })
        .eq('id', payment.id)

      const { data: subscription, error: activationError } = await admin.rpc('activate_paid_subscription', {
        p_provider_reference: txRef,
        p_amount_rwf: payment.amount_rwf,
        p_currency: 'RWF',
      })
      if (activationError) {
        console.error('activate_paid_subscription failed', activationError)
        // Return 500 so the provider can retry the webhook.
        return json({ error: 'Payment was verified but the subscription could not be activated.' }, 500)
      }
      return json({ ok: true, verified: true, subscription_id: subscription?.id ?? null })
    }

    if (status === 'failed' || status === 'cancelled') {
      await admin
        .from('payments')
        .update({
          status: 'failed',
          provider_transaction_id: transactionId,
          raw_payload: payload,
          updated_at: now,
        })
        .eq('id', payment.id)
    }
    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
})
