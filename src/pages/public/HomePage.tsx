import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Check,
  Code2,
  Files,
  Fingerprint,
  Lock,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { listPlans, listServices } from '@/lib/repository'
import { fallbackFaqs, fallbackPlans, fallbackServices } from '@/lib/catalog'
import { SectionHeading } from '@/components/marketing/PageHero'
import { buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn, formatRwf } from '@/lib/utils'
import type { Plan, Service } from '@/types/domain'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans)
  const [services, setServices] = useState<Service[]>(fallbackServices)

  useEffect(() => {
    void listPlans().then(setPlans).catch(() => undefined)
    void listServices().then(setServices).catch(() => undefined)
  }, [])

  const startConversation = (event: FormEvent) => {
    event.preventDefault()
    if (!prompt.trim()) return
    sessionStorage.setItem('peaceai.initialPrompt', prompt.trim())
    navigate(user ? '/app/assistant?new=1' : '/signup?next=/app/assistant')
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[55rem] -translate-x-1/2 rounded-full bg-accent/[0.09] blur-[110px]" aria-hidden="true" />
        <div className="container-page relative pb-20 pt-16 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Secure AI workspace
              </span>
              <Badge tone="blue">Built for Rwanda and beyond</Badge>
            </div>
            <h1 className="mt-6 text-balance text-[2.65rem] font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.5rem]">
              Imagine It. Build It.{' '}
              <span className="relative whitespace-nowrap text-accent">
                Secure It.
                <svg
                  className="absolute -bottom-2 left-0 w-full text-accent/30"
                  viewBox="0 0 300 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2 9C80 2 220 2 298 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{' '}
              With PeaceAI.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-slate-400 sm:text-lg">
              One thoughtful platform for intelligent conversations, AI-assisted development,
              defensive cybersecurity, private cloud storage, and collaboration.
            </p>

            <form
              onSubmit={startConversation}
              className="mx-auto mt-9 max-w-2xl rounded-2xl border border-white/10 bg-ink-900/80 p-2 shadow-glow backdrop-blur"
            >
              <div className="flex items-end gap-2">
                <label htmlFor="hero-prompt" className="sr-only">
                  Ask PeaceAI
                </label>
                <textarea
                  id="hero-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  rows={2}
                  placeholder="Describe what you want to build, fix, or secure…"
                  className="min-h-[3.6rem] flex-1 resize-none bg-transparent px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className={buttonStyles({ className: 'mb-0.5 h-11 w-11 shrink-0 px-0' })}
                  aria-label="Start conversation"
                  disabled={!prompt.trim()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-3 py-2 text-[11px] text-slate-500">
                <Lock className="h-3 w-3 text-accent" />
                Prompts are protected by authenticated server-side calls
                <span className="mx-1 hidden h-3 w-px bg-white/10 sm:block" />
                <span>No training on your private conversations by default</span>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-accent" /> Free plan available
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-accent" /> 6 GiB private storage
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-accent" /> Server-enforced limits
              </span>
            </div>
          </div>

          <HeroWorkspacePreview />
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: '5', label: 'layers of platform capability' },
            { value: '6 GiB', label: 'default private storage' },
            { value: '3', label: 'configurable plans' },
            { value: 'RLS', label: 'database-enforced access' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-display text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-20 sm:py-28">
        <SectionHeading
          eyebrow="What you can do"
          title="A practical toolkit, not a demo."
          description="PeaceAI connects the work of thinking, building, securing, storing, and collaborating — with clear limits and secure defaults."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: MessageSquare,
              title: 'AI Assistant',
              description:
                'Ask questions, explain code, debug problems, summarize documents, and plan projects with saved conversations.',
              to: '/assistant',
              tone: 'text-accent bg-accent/10',
            },
            {
              icon: Code2,
              title: 'AI Development',
              description:
                'Turn a project description into a structured proposal with features, milestones, risks, and starter structure.',
              to: '/development',
              tone: 'text-sky-300 bg-sky-400/10',
            },
            {
              icon: ShieldCheck,
              title: 'Cybersecurity',
              description:
                'Authorized defensive assessments, secure architecture, authentication reviews, and remediation guidance.',
              to: '/cybersecurity',
              tone: 'text-violet-300 bg-violet-400/10',
            },
            {
              icon: Files,
              title: 'Cloud Storage',
              description:
                'Organize source code, documents, and data in private folders with 6 GiB included by default.',
              to: user ? '/app/storage' : '/signup',
              tone: 'text-amber-300 bg-amber-400/10',
            },
            {
              icon: Users,
              title: 'Collaboration',
              description:
                'Find other users, exchange messages, share selected files, and control access at any time.',
              to: user ? '/app/collaboration' : '/signup',
              tone: 'text-rose-300 bg-rose-400/10',
            },
            {
              icon: Bot,
              title: 'Knowledge Retrieval',
              description:
                'Administrators can upload approved documents, index them, and let the assistant answer with source attribution.',
              to: user ? '/app/assistant' : '/signin',
              tone: 'text-emerald-300 bg-emerald-400/10',
            },
          ].map((feature) => (
            <Link
              key={feature.title}
              to={feature.to}
              className="group card-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
            >
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', feature.tone)}>
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Explore <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-20 sm:py-28">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              align="left"
              eyebrow="Technology services"
              title="From an idea to a production plan."
              description="Request a scoped service, share your requirements, and receive a quotation after review. Estimates are never presented as binding without approval."
            />
            <Link to="/services" className={buttonStyles({ variant: 'outline' })}>
              Browse all services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {services.slice(0, 3).map((service) => (
              <ServicePreviewCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20 sm:py-28">
        <SectionHeading
          eyebrow="Simple pricing"
          title="Start free. Upgrade when the work grows."
          description="Transparent RWF pricing with configurable limits. Paid plans do not mean unlimited AI usage."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanPreviewCard key={plan.id} plan={plan} featured={plan.slug === 'pro'} />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Prices are proposed launch prices in Rwandan francs and can be changed by an administrator.
        </p>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-20 sm:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              align="left"
              eyebrow="How it works"
              title="A clear path from question to outcome."
            />
            <div className="mt-9 space-y-6">
              {[
                ['Create a secure account', 'Register, verify your email, and choose a plan. Administrator roles are never granted through public registration.'],
                ['Ask, plan, or build', 'Use the assistant to reason through a problem, or generate a structured software proposal with assumptions and open questions.'],
                ['Store and collaborate', 'Keep files private by default, share selected resources, and manage every permission from your dashboard.'],
                ['Request expert help', 'Submit a service request for human review. A quotation is issued only after scope and pricing are approved.'],
              ].map(([title, description], index) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 font-mono text-sm text-accent">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card-surface relative overflow-hidden p-7">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/[0.06] blur-3xl" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Project proposal</p>
                <h3 className="mt-1 text-lg font-semibold">Community Skills Directory</h3>
              </div>
              <Badge tone="amber">Draft</Badge>
            </div>
            <div className="mt-6 space-y-3">
              {[
                ['Scope', 'Profiles, search, verification, requests'],
                ['Timeline', '5–6 weeks after scope confirmation'],
                ['Key risk', 'Verification rules need owner approval'],
                ['Next step', 'Confirm launch requirements'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-right text-xs font-medium text-slate-200">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-xs leading-5 text-amber-200/70">
              AI-generated proposals are drafts. PeaceAI does not guarantee that generated code is
              error-free, secure, or production-ready.
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20 sm:py-28">
        <SectionHeading
          eyebrow="Security is the foundation"
          title="Designed to protect the people using it."
          description="PeaceAI treats authorization, privacy, and cost control as product requirements — not add-ons."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Fingerprint,
              title: 'Verified identity',
              text: 'Email verification, secure sessions, password reset, and optional MFA where supported.',
            },
            {
              icon: Lock,
              title: 'Private by default',
              text: 'Private storage buckets, short-lived signed links, and row-level security.',
            },
            {
              icon: ShieldCheck,
              title: 'Server enforcement',
              text: 'Roles, quotas, and sharing permissions are validated by the database and server functions.',
            },
            {
              icon: WalletCards,
              title: 'No surprise billing',
              text: 'Usage limits and provider costs are configurable. Features activate only after verified payment webhooks.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <item.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-16">
        <div className="container-page">
          <SectionHeading
            eyebrow="Authentic feedback only"
            title="No invented customers. No fake reviews."
            description="PeaceAI is an early-stage platform. Verified customer stories and consented testimonials will be published here after real engagements. Until then, we would rather show you how the product works."
          />
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-3">
            <Link to="/services" className={buttonStyles({ variant: 'outline' })}>
              Review our services
            </Link>
            <Link to="/contact" className={buttonStyles({ variant: 'ghost' })}>
              Talk to the team
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            align="left"
            eyebrow="Questions"
            title="Clear answers before you commit."
            description="If something is not covered here, contact us and we will answer directly."
          />
          <div className="divide-y divide-white/[0.07] rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6">
            {fallbackFaqs.slice(0, 6).map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 pr-6 text-sm leading-6 text-slate-400">{faq.answer}</p>
              </details>
            ))}
            <div className="py-5">
              <Link to="/faq" className="text-sm font-medium text-accent hover:text-accent-light">
                Read all frequently asked questions →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-accent/[0.1] via-ink-900 to-sky-400/[0.04] px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">Have a problem worth solving?</h2>
            <p className="mt-4 text-slate-400">
              Start a conversation, outline a project, or ask for a scoped service. We will be clear
              about what is automated, what is human-reviewed, and what still needs configuration.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to={user ? '/app/assistant' : '/signup'} className={buttonStyles({ size: 'lg' })}>
                {user ? 'Open the assistant' : 'Create your account'} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className={buttonStyles({ size: 'lg', variant: 'outline' })}>
                Contact PeaceAI
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function HeroWorkspacePreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl animate-fade-up">
      <div className="absolute -inset-6 rounded-[2rem] bg-accent/[0.03] blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/90 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
          </div>
          <span className="text-[11px] text-slate-500">PeaceAI workspace · interface preview</span>
          <Badge tone="accent">Secure</Badge>
        </div>
        <div className="grid lg:grid-cols-[220px_1fr]">
          <div className="hidden border-r border-white/[0.07] p-3 lg:block">
            <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.16em] text-slate-600">Conversations</p>
            {['Plan a web application', 'Review authentication flow', 'Explain this database schema', 'Security checklist'].map(
              (title, index) => (
                <div
                  key={title}
                  className={cn(
                    'mb-1 rounded-lg px-2.5 py-2 text-xs',
                    index === 0 ? 'bg-accent/10 text-accent' : 'text-slate-500',
                  )}
                >
                  {title}
                </div>
              ),
            )}
            <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Daily usage</span>
                <span>8 / 25</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/3 rounded-full bg-accent" />
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Assistant · Standard model
            </div>
            <div className="mt-5 space-y-4">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent/10 px-4 py-3 text-sm text-slate-200">
                Help me plan a secure member portal for a small organization.
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
                <p className="mb-2 font-medium text-white">Here is a practical starting plan:</p>
                <ul className="space-y-1.5 text-xs leading-5">
                  <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Define roles, data, and account lifecycle before choosing screens.</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Use server-enforced authorization and private storage.</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Add an audit trail for sensitive administrative actions.</li>
                </ul>
                <div className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-slate-500">
                  Draft guidance · review with a qualified professional before production
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 text-xs text-slate-500">
              <span className="flex-1">Ask a follow-up question…</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-ink-950">
                <Send className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-600">
        Interface illustration. AI responses require a configured provider.
      </p>
    </div>
  )
}

function ServicePreviewCard({ service }: { service: Service }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="group flex flex-col rounded-2xl border border-white/[0.08] bg-ink-900/60 p-6 transition-all hover:border-accent/30 hover:bg-ink-900"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone="neutral">{service.category?.name ?? 'Service'}</Badge>
        <ArrowRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-accent" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{service.short_description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs">
        <span className="text-slate-500">{service.estimated_timeline}</span>
        <span className="font-medium text-white">
          {service.price_from_rwf ? `From ${formatRwf(service.price_from_rwf)}` : 'Request a quote'}
        </span>
      </div>
    </Link>
  )
}

function PlanPreviewCard({ plan, featured }: { plan: Plan; featured?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6',
        featured
          ? 'border-accent/35 bg-gradient-to-b from-accent/[0.08] to-ink-900 shadow-glow'
          : 'border-white/[0.08] bg-ink-900/60',
      )}
    >
      {featured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
          Most popular
        </span>
      ) : null}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 min-h-10 text-sm text-slate-400">{plan.description}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-3xl font-semibold text-white">{formatRwf(plan.price_rwf)}</span>
        <span className="text-sm text-slate-500">/month</span>
      </div>
      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.slice(0, 6).map((feature) => (
          <li key={feature} className="flex gap-2 text-sm text-slate-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        to="/pricing"
        className={buttonStyles({
          variant: featured ? 'primary' : 'outline',
          className: 'mt-6 w-full',
        })}
      >
        Compare {plan.name}
      </Link>
    </div>
  )
}
