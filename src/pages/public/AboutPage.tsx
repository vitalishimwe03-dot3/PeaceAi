import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Compass, HeartHandshake, ShieldCheck, Users } from 'lucide-react'
import { PageHero, SectionHeading } from '@/components/marketing/PageHero'
import { buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { env } from '@/lib/env'

export function AboutPage() {
  const { configured } = useAuth()
  return (
    <>
      <PageHero
        eyebrow="About PeaceAI"
        title={<>Technology should expand what people can do safely.</>}
        description="PeaceAI is an early-stage platform built to make useful AI, software delivery, and defensive security more accessible — with honest limits and secure foundations."
      />

      <section className="container-page py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Why we exist"
              title="A practical platform for people building real things."
              description="Individuals, students, developers, businesses, and organizations often face the same gap: powerful tools are fragmented, expensive, or unclear about their limits. PeaceAI brings the essential pieces into one workspace."
            />
            <p className="mt-5 text-sm leading-7 text-slate-400">
              The platform combines an AI assistant, structured project planning, private storage,
              user collaboration, service requests, and defensive security support. It is designed
              to be useful before it is impressive — and transparent when something depends on an
              external provider or human review.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Compass, title: 'Clarity over hype', text: 'No claims of a proprietary foundation model, fake customers, or guaranteed security.' },
              { icon: ShieldCheck, title: 'Secure by default', text: 'Private storage, row-level security, server-enforced roles, and safe error messages.' },
              { icon: HeartHandshake, title: 'Human accountability', text: 'AI drafts are labeled. High-impact work is reviewed and quoted by a person.' },
              { icon: Users, title: 'Accessible by design', text: 'Responsive layouts, keyboard navigation, readable contrast, and clear empty states.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <item.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="How we work"
            title="A small set of commitments."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ['Scope before price', 'We ask questions before quoting. Missing information becomes an assumption or an open question, not a hidden cost.'],
              ['Evidence before claims', 'Security work is scoped in writing, tested lawfully, and reported with reproducible evidence.'],
              ['Limits before scale', 'AI usage, storage, and service delivery have explicit limits that are enforced server-side.'],
              ['Privacy before convenience', 'Files are private by default. Sharing is specific and revocable.'],
              ['People before automation', 'Payments, quotations, and account restrictions are checked by the backend and, where appropriate, a human.'],
              ['Honesty before polish', 'Unconfigured integrations are labeled. Nothing pretends to work when credentials are missing.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-white/[0.07] bg-ink-950/40 p-5">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="configuration" className="container-page scroll-mt-24 py-20">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge tone={configured ? 'accent' : 'amber'}>
                {configured ? 'Supabase connected' : 'Local preview mode'}
              </Badge>
              <h2 className="mt-3 text-2xl font-semibold">External service configuration</h2>
            </div>
            <Link to="/faq" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
              Read setup FAQ
            </Link>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            PeaceAI is designed to run with external services. The frontend is currently
            {configured ? ' connected to Supabase. ' : ' running without Supabase credentials, using local preview data only. '}
            AI, payments, and transactional email remain independently configurable and are not claimed
            to be active until their server-side credentials are set and tested.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Supabase database and auth', configured ? 'Configured' : 'Requires VITE_SUPABASE_URL and anon key'],
              ['AI provider', 'Requires AI_API_KEY and server deployment'],
              ['File storage', configured ? 'Supabase Storage buckets required' : 'Preview uses browser storage'],
              ['Payments', 'Requires tested Flutterwave credentials'],
              ['Transactional email', 'Requires a verified Resend domain'],
              ['Knowledge retrieval', 'Requires pgvector, an embedding provider, and processing function'],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-ink-950/50 p-4">
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-xs leading-5 text-amber-100/70">
              Contact details shown on this site ({env.supportEmail}, {env.supportPhone}) are proposed
              placeholders and require owner confirmation before production use. The phone number must
              be explicitly authorized for mobile-money payments before it is displayed as a payment contact.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-accent/15 bg-accent/[0.04] p-8 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-xl font-semibold">Have a question about the platform?</h2>
            <p className="mt-1 text-sm text-slate-400">We will be clear about what is available today.</p>
          </div>
          <Link to="/contact" className={buttonStyles()}>
            Contact us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
