import { useState, type FormEvent } from 'react'
import { Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react'
import { PageHero } from '@/components/marketing/PageHero'
import { Input, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { env } from '@/lib/env'
import { invokeFunction } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/utils'

export function ContactPage() {
  const { user, configured } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(user?.profile.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!subject.trim() || message.trim().length < 20) {
      toast({ title: 'Add a little more detail', description: 'Include a subject and at least 20 characters in your message.', tone: 'error' })
      return
    }
    setLoading(true)
    try {
      if (!configured) {
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
        window.location.href = `mailto:${env.supportEmail}?subject=${encodeURIComponent(subject)}&body=${body}`
        setSent(true)
        return
      }
      await invokeFunction<{ success: boolean }>('contact-message', {
        name,
        email,
        subject,
        message,
      })
      setSent(true)
      setSubject('')
      setMessage('')
      toast({
        title: 'Message received',
        description: 'The PeaceAI team will respond to the email address you provided.',
        tone: 'success',
      })
    } catch (error) {
      toast({ title: 'Message could not be sent', description: getErrorMessage(error), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title={<>Let’s talk about what you need.</>}
        description="Questions about the platform, a service request, security scope, or an existing project. We will tell you what requires configuration or human review."
      />

      <section className="container-page py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="card-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Send a message</h2>
            <p className="mt-1 text-sm text-slate-400">
              Do not include passwords, API keys, or sensitive personal data.
            </p>
            {sent ? (
              <div className="mt-6 rounded-xl border border-accent/20 bg-accent/[0.06] p-5">
                <p className="text-sm font-medium text-white">
                  {configured ? 'Your message has been submitted.' : 'Your email app should open with the message ready to send.'}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {configured
                    ? 'A confirmation may be sent if transactional email is configured.'
                    : 'This local preview uses your email client because no transactional email provider is configured.'}
                </p>
                <button type="button" onClick={() => setSent(false)} className="mt-3 text-xs font-medium text-accent">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                  <Input
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <Input
                  label="Subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="How can we help?"
                  required
                  maxLength={120}
                />
                <Textarea
                  label="Message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={7}
                  required
                  minLength={20}
                  maxLength={5000}
                  hint={`${message.length}/5000 characters`}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500">
                    By sending, you agree to the Privacy Policy and Acceptable Use Policy.
                  </p>
                  <Button type="submit" loading={loading}>
                    <Send className="h-4 w-4" /> Send message
                  </Button>
                </div>
              </form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold">Direct contact</h2>
              <div className="mt-4 space-y-4 text-sm">
                <a href={`mailto:${env.supportEmail}`} className="flex gap-3 text-slate-300 hover:text-white">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    <span className="block text-xs text-slate-500">Email</span>
                    {env.supportEmail}
                  </span>
                </a>
                <a href={`tel:${env.supportPhone}`} className="flex gap-3 text-slate-300 hover:text-white">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    <span className="block text-xs text-slate-500">Phone</span>
                    {env.supportPhone}
                  </span>
                </a>
                <div className="flex gap-3 text-slate-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    <span className="block text-xs text-slate-500">Service area</span>
                    Rwanda, with remote collaboration
                  </span>
                </div>
              </div>
              <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-5 text-slate-600">
                Proposed contact details require owner confirmation. Response times depend on the
                configured email provider and support schedule.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <MessageSquare className="h-5 w-5 text-accent" />
              <h2 className="mt-3 text-sm font-semibold">Service requests</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                For a scoped quotation, choose a service and submit requirements, budget, and timing
                through the marketplace.
              </p>
              <a href="/services" className="mt-3 inline-block text-xs font-medium text-accent hover:text-accent-light">
                Browse services →
              </a>
            </div>

            <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.04] p-5">
              <h2 className="text-sm font-semibold">Security reports</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Report vulnerabilities privately. Do not access other users’ data or disrupt the service.
              </p>
              <a href="/legal/security" className="mt-3 inline-block text-xs font-medium text-rose-300 hover:text-rose-200">
                Security Disclosure Policy →
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
