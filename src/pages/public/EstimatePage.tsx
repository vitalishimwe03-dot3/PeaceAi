import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Download,
  Mail,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero } from '@/components/marketing/PageHero'
import { buttonStyles, Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { env } from '@/lib/env'
import { cn, downloadTextFile, formatRwf } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Pricing model — owner-tunable constants.                            */
/* All amounts are rough orders of magnitude in RWF. Adjust the rate   */
/* and ranges to your real costs before publishing the numbers.        */
/* ------------------------------------------------------------------ */
const WEEK_RATE_RWF = 1_800_000 // blended cost per person-week (2-dev team would be 2x)
const RANGE = 0.25 // show ±25% band around the central estimate
const TEAM_CAPACITY = 1.5 // calendar weeks per person-week with a small team in parallel

type ProjectTypeId =
  | 'website'
  | 'webapp'
  | 'mobile'
  | 'ecommerce'
  | 'internal'
  | 'api'

interface ProjectTypeDef {
  id: ProjectTypeId
  label: string
  description: string
  baseWeeks: number
  stack: string[]
}

const PROJECT_TYPES: ProjectTypeDef[] = [
  {
    id: 'website',
    label: 'Marketing website',
    description: 'Fast, accessible site with CMS-managed pages and contact forms.',
    baseWeeks: 3.5,
    stack: ['React + Vite', 'Tailwind CSS', 'Headless CMS', 'Supabase or Netlify hosting'],
  },
  {
    id: 'webapp',
    label: 'Web application',
    description: 'Accounts, dashboards, workflows — the full product.',
    baseWeeks: 11,
    stack: ['React + TypeScript', 'Supabase (auth + Postgres)', 'Tailwind CSS', 'Edge Functions'],
  },
  {
    id: 'mobile',
    label: 'Mobile application',
    description: 'Android and iOS app with shared codebase and push notifications.',
    baseWeeks: 15,
    stack: ['React Native or Flutter', 'Supabase', 'Push notifications', 'App Store + Play release'],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    description: 'Catalog, cart, checkout, mobile money / card payments, orders.',
    baseWeeks: 9,
    stack: ['React + TypeScript', 'Flutterwave (cards + MoMo)', 'Supabase', 'Webhook-driven fulfilment'],
  },
  {
    id: 'internal',
    label: 'Internal tool',
    description: 'Back-office dashboard for your team: records, approvals, reports.',
    baseWeeks: 7,
    stack: ['React + TypeScript', 'Supabase RLS', 'Role-based access', 'CSV / Excel import-export'],
  },
  {
    id: 'api',
    label: 'API / integrations',
    description: 'Backend services, webhooks, and third-party system connectors.',
    baseWeeks: 5.5,
    stack: ['Supabase Edge Functions', 'Postgres + RLS', 'Signed webhooks', 'OpenAPI documentation'],
  },
]

interface FeatureDef {
  id: string
  label: string
  weeks: number
}

const FEATURES: FeatureDef[] = [
  { id: 'auth', label: 'User accounts & roles', weeks: 1.5 },
  { id: 'admin', label: 'Admin dashboard', weeks: 2 },
  { id: 'payments', label: 'Payments (cards / mobile money)', weeks: 2.5 },
  { id: 'storage', label: 'File storage & sharing', weeks: 1.25 },
  { id: 'realtime', label: 'Realtime chat / notifications', weeks: 2 },
  { id: 'ai', label: 'AI features (assistant, drafting)', weeks: 2.5 },
  { id: 'reporting', label: 'Reporting & analytics', weeks: 1.5 },
  { id: 'integrations', label: 'Third-party integrations (each)', weeks: 1 },
  { id: 'i18n', label: 'Kinyarwanda / French versions', weeks: 1.5 },
  { id: 'offline', label: 'Offline support', weeks: 2 },
]

const ROLE_OPTIONS = [
  { id: '1', label: '1 type of user', multiplier: 1 },
  { id: '2', label: '2–3 roles', multiplier: 1.15 },
  { id: '4', label: '4+ roles (admin, staff, clients…)', multiplier: 1.35 },
] as const

interface EstimateInput {
  projectType: ProjectTypeId | ''
  features: Record<string, boolean>
  integrationCount: number
  roles: string
  budgetRwf: string
  projectName: string
  contactName: string
  contactEmail: string
}

const EMPTY_INPUT: EstimateInput = {
  projectType: '',
  features: {},
  integrationCount: 1,
  roles: '1',
  budgetRwf: '',
  projectName: '',
  contactName: '',
  contactEmail: '',
}

interface EstimateResult {
  centralWeeks: number
  totalWeeks: number
  priceLow: number
  priceHigh: number
  calendarLow: number
  calendarHigh: number
  risks: string[]
  stack: string[]
  breakdown: Array<{ label: string; weeks: number }>
  underBudget: boolean
}

function computeEstimate(input: EstimateInput): EstimateResult | null {
  const type = PROJECT_TYPES.find((t) => t.id === input.projectType)
  if (!type) return null

  const breakdown: Array<{ label: string; weeks: number }> = [
    { label: `${type.label} base build`, weeks: type.baseWeeks },
  ]
  let featureWeeks = 0
  for (const feature of FEATURES) {
    if (!input.features[feature.id]) continue
    const qty = feature.id === 'integrations' ? Math.min(Math.max(input.integrationCount, 1), 6) : 1
    const weeks = feature.weeks * qty
    featureWeeks += weeks
    breakdown.push({ label: feature.id === 'integrations' ? `${feature.label} ×${qty}` : feature.label, weeks })
  }

  const multiplier = ROLE_OPTIONS.find((r) => r.id === input.roles)?.multiplier ?? 1
  const totalWeeks = (type.baseWeeks + featureWeeks) * multiplier
  const priceLow = Math.round(totalWeeks * WEEK_RATE_RWF * (1 - RANGE))
  const priceHigh = Math.round(totalWeeks * WEEK_RATE_RWF * (1 + RANGE))
  const calendarLow = Math.max(2, Math.round((totalWeeks / TEAM_CAPACITY) * 0.85))
  const calendarHigh = Math.max(3, Math.round((totalWeeks / TEAM_CAPACITY) * 1.25))

  const risks: string[] = []
  if (input.features.payments) {
    risks.push('Payments need Flutterwave verification and a mobile-money compliance review before go-live.')
  }
  if (input.features.ai) {
    risks.push('AI usage is billed per token — budget an ongoing monthly AI allowance, not just build cost.')
  }
  if (input.features.i18n) {
    risks.push('Kinyarwanda/French copy needs native review; machine translation is not launch-quality.')
  }
  if (input.features.offline) {
    risks.push('Offline mode adds conflict-resolution QA — test on real low-end Android devices.')
  }
  if (input.features.payments || input.features.auth) {
    risks.push('Handling personal data requires a Rwanda Law 058/2021 data-protection review.')
  }
  if (input.features.realtime) {
    risks.push('Realtime features increase hosting and load-testing needs as users grow.')
  }

  const statedBudget = Number(input.budgetRwf.replace(/[^\d]/g, ''))
  const underBudget = Number.isFinite(statedBudget) && statedBudget > 0 && statedBudget < priceLow
  if (underBudget) {
    risks.push('Your stated budget is below this estimate — we can phase the scope into an MVP first.')
  }

  return {
    centralWeeks: totalWeeks,
    totalWeeks,
    priceLow,
    priceHigh,
    calendarLow,
    calendarHigh,
    risks,
    stack: type.stack,
    breakdown,
    underBudget,
  }
}

function buildMarkdown(input: EstimateInput, result: EstimateResult) {
  const type = PROJECT_TYPES.find((t) => t.id === input.projectType)
  const lines = [
    `# PeaceAI project brief — ${input.projectName.trim() || 'Untitled project'}`,
    '',
    `Prepared by PeaceAI Estimator on ${new Date().toLocaleDateString('en-RW', { dateStyle: 'long' })}.`,
    input.contactName.trim() ? `Contact: ${input.contactName.trim()}${input.contactEmail.trim() ? ` <${input.contactEmail.trim()}>` : ''}` : '',
    '',
    `## Type`,
    type?.label ?? 'Not selected',
    '',
    `## Scope breakdown`,
    ...result.breakdown.map((row) => `- ${row.label}: ~${row.weeks.toFixed(2)} person-weeks`),
    '',
    `## Effort & price (indicative)`,
    `- Effort: ~${result.totalWeeks.toFixed(1)} person-weeks`,
    `- Price band: ${formatRwf(result.priceLow)} – ${formatRwf(result.priceHigh)}`,
    `- Timeline: ~${result.calendarLow}–${result.calendarHigh} weeks with a small team`,
    '',
    `## Recommended stack`,
    ...result.stack.map((s) => `- ${s}`),
    '',
    `## Risks & notes`,
    ...(result.risks.length ? result.risks.map((r) => `- ${r}`) : ['- None flagged.']),
    '',
    `This is a rough order of magnitude, not a quotation. A final scope and fixed price follow a free discovery call.`,
  ]
  return lines.filter((l) => l !== '').join('\n')
}

const STORAGE_KEY = 'peaceai.estimate.v1'

export function EstimatePage() {
  const [input, setInput] = useState<EstimateInput>(EMPTY_INPUT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setInput({ ...EMPTY_INPUT, ...(JSON.parse(raw) as Partial<EstimateInput>) })
    } catch {
      // Fresh visitor — start clean.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
    } catch {
      // Private mode — the estimate still works, just not persisted.
    }
  }, [input])

  const result = useMemo(() => computeEstimate(input), [input])

  const update = <K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }))

  const toggleFeature = (id: string) =>
    setInput((current) => ({
      ...current,
      features: { ...current.features, [id]: !current.features[id] },
    }))

  const markdown = result ? buildMarkdown(input, result) : ''
  const downloadName = `peaceai-brief-${(input.projectName.trim() || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
  const mailto = result
    ? `mailto:${env.supportEmail}?subject=${encodeURIComponent(`Project brief — ${input.projectName.trim() || 'new build'}`)}&body=${encodeURIComponent(markdown)}`
    : '#'

  return (
    <>
      <PageHero
        eyebrow="Free project estimator"
        title={
          <>
            Scope your app, <span className="text-accent">price it</span>,
            <br />
            in two minutes.
          </>
        }
        description="Answer a few questions and get an indicative effort, timeline and RWF price band for your website, web app, mobile app, or e-commerce project — plus a downloadable brief you can send us for a fixed quote."
      />

      <section className="container-page py-14 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
          {/* ---------------- Questionnaire ---------------- */}
          <div className="space-y-10">
            {/* 1 — project type */}
            <fieldset>
              <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                1 · What are you building?
              </legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PROJECT_TYPES.map((type) => {
                  const active = input.projectType === type.id
                  return (
                    <label
                      key={type.id}
                      className={cn(
                        'cursor-pointer rounded-2xl border p-4 transition-colors',
                        active
                          ? 'border-accent/50 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(255,138,76,.35)]'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]',
                      )}
                    >
                      <input
                        type="radio"
                        name="project-type"
                        value={type.id}
                        checked={active}
                        onChange={() => update('projectType', type.id)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-content-strong">{type.label}</span>
                        {active ? <Check className="h-4 w-4 text-accent" aria-hidden="true" /> : null}
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-slate-400">{type.description}</p>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* 2 — capabilities */}
            <fieldset>
              <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                2 · Which capabilities?
              </legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {FEATURES.map((feature) => {
                  const checked = Boolean(input.features[feature.id])
                  return (
                    <label
                      key={feature.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                        checked
                          ? 'border-accent/50 bg-accent/[0.07]'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeature(feature.id)}
                        className="mt-0.5 h-4 w-4 accent-[#ff8a4c]"
                      />
                      <span className="text-sm leading-5 text-content-strong">
                        {feature.label}
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          +{feature.weeks} wk{feature.id === 'integrations' ? ' each' : ''}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              {input.features.integrations ? (
                <div className="mt-3 max-w-xs">
                  <Label htmlFor="integration-count">How many integrations?</Label>
                  <input
                    id="integration-count"
                    type="number"
                    min={1}
                    max={6}
                    value={input.integrationCount}
                    onChange={(event) => update('integrationCount', Number(event.target.value) || 1)}
                    className="w-full rounded-xl border border-line bg-surface-sunken px-3.5 py-2.5 text-sm text-content-strong focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              ) : null}
            </fieldset>

            {/* 3 — roles */}
            <fieldset>
              <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                3 · How many kinds of users?
              </legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {ROLE_OPTIONS.map((option) => {
                  const active = input.roles === option.id
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'cursor-pointer rounded-xl border px-3.5 py-3 text-sm transition-colors',
                        active
                          ? 'border-accent/50 bg-accent/[0.07] text-content-strong'
                          : 'border-white/[0.07] bg-white/[0.02] text-slate-300 hover:border-white/[0.14]',
                      )}
                    >
                      <input
                        type="radio"
                        name="roles"
                        value={option.id}
                        checked={active}
                        onChange={() => update('roles', option.id)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* 4 — budget + project identity */}
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="col-span-full text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                4 · About the project
              </legend>
              <Input
                label="Project name"
                optional
                placeholder="e.g. Youth skills directory"
                value={input.projectName}
                onChange={(event) => update('projectName', event.target.value)}
              />
              <Input
                label="Your budget (RWF)"
                optional
                inputMode="numeric"
                placeholder="e.g. 3,500,000"
                value={input.budgetRwf}
                onChange={(event) => update('budgetRwf', event.target.value)}
                hint="Used only to flag if your budget covers the scope."
              />
              <Input
                label="Your name"
                optional
                placeholder="e.g. Grace Uwase"
                value={input.contactName}
                onChange={(event) => update('contactName', event.target.value)}
              />
              <Input
                label="Your email"
                optional
                type="email"
                placeholder="you@example.com"
                value={input.contactEmail}
                onChange={(event) => update('contactEmail', event.target.value)}
              />
            </fieldset>
          </div>

          {/* ---------------- Live result ---------------- */}
          <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-white/[0.08] bg-ink-900/60 p-6 shadow-card backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Your estimate</p>
              <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>

            {!result ? (
              <div className="mt-6 rounded-xl border border-dashed border-white/[0.12] p-6 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" />
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Pick a project type on the left — your estimate updates live as you answer.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Indicative price band
                  </p>
                  <p className="mt-1.5 text-3xl font-semibold leading-tight text-content-strong">
                    {formatRwf(result.priceLow)}
                    <span className="mx-2 text-slate-600">–</span>
                    {formatRwf(result.priceHigh)}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    ~{result.totalWeeks.toFixed(1)} person-weeks · {result.calendarLow}–
                    {result.calendarHigh} weeks calendar with a small team
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Breakdown</p>
                  <ul className="mt-2 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
                    {result.breakdown.map((row) => (
                      <li key={row.label} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span className="text-slate-300">{row.label}</span>
                        <span className="font-mono text-xs text-slate-500">{row.weeks.toFixed(1)}w</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {result.risks.length ? (
                  <div className="mt-6">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Watch-outs
                    </p>
                    <ul className="mt-2 space-y-2">
                      {result.risks.map((risk) => (
                        <li key={risk} className="flex gap-2.5 text-xs leading-5 text-amber-200/80">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" aria-hidden="true" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Suggested stack
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.stack.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => downloadTextFile(downloadName, markdown, 'text/markdown')}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download brief (.md)
                  </Button>
                  <a href={mailto} className={buttonStyles({ variant: 'primary' })}>
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Email this brief for a fixed quote
                  </a>
                  <Button variant="ghost" onClick={() => setInput(EMPTY_INPUT)}>
                    Start over
                  </Button>
                </div>

                <p className="mt-4 text-[11px] leading-4 text-slate-600">
                  Rough order of magnitude — not a quotation. Not included: hosting & devices, content
                  writing, legal review, app-store fees, ongoing maintenance. Final scope and fixed
                  price follow a free discovery call.{' '}
                  <Link to="/contact" className="text-accent hover:underline">
                    Book one →
                  </Link>
                </p>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="border-t border-white/[0.06]">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-content-strong">Prefer to talk it through?</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
              Send us the brief you just generated — we reply within one business day with a fixed
              quote and timeline.
            </p>
          </div>
          <Link to="/contact" className={buttonStyles({ variant: 'soft' })}>
            Contact PeaceAI
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
