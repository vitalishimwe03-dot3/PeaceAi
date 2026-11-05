import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { HttpError, handleError, json, parseJson, preflight, serviceClient } from '../_shared/http.ts'

// Public contact endpoint. Add rate limiting (IP hash + time window) and email sending as configured.
serve(async (req) => {
  const options = preflight(req)
  if (options) return options
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)
  try {
    const body = await parseJson<{ name?: string; email?: string; subject?: string; message?: string }>(req)
    const name = (body.name || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const subject = (body.subject || '').trim()
    const message = (body.message || '').trim()
    if (name.length < 1 || name.length > 120) throw new HttpError(400, 'Name is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'A valid email is required.')
    if (subject.length < 1 || subject.length > 200) throw new HttpError(400, 'Subject is required.')
    if (message.length < 20 || message.length > 5000) throw new HttpError(400, 'Message must be 20–5000 characters.')

    const admin = serviceClient()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const data = new TextEncoder().encode(ip + (Deno.env.get('INTERNAL_JOB_SECRET') || ''))
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data))).map((b) => b.toString(16).padStart(2, '0')).join('')
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await admin.from('contact_messages').select('id', { count: 'exact', head: true }).eq('ip_hash', hash).gte('created_at', since)
    if ((count ?? 0) >= 5) throw new HttpError(429, 'Too many messages. Please try again later.')

    const { error } = await admin.from('contact_messages').insert({
      name, email, subject, message, ip_hash: hash, user_agent: (req.headers.get('user-agent') || '').slice(0, 500), email_sent: false,
    })
    if (error) throw error

    // Optional: send via Resend when RESEND_API_KEY + EMAIL_FROM are configured.
    const resend = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('EMAIL_FROM')
    const to = Deno.env.get('ADMIN_ALERT_EMAIL') || 'vitalishimwe03@gmail.com'
    if (resend && from) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject: `[PeaceAI Contact] ${subject}`, text: `From: ${name} <${email}>\n\n${message}` }),
      }).catch(() => null)
    }

    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
})