import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ClipboardList,
  Code2,
  FileJson,
  GitBranch,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHero, SectionHeading } from '@/components/marketing/PageHero'
import { buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function DevelopmentLandingPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHero
        eyebrow="AI Development"
        title={<>Turn a rough idea into a reviewable project plan.</>}
        description="Describe the application, define the audience and constraints, and generate a structured proposal with features, milestones, risks, and assumptions. Refine it, save it, or request a human quotation."
        actions={
          <>
            <Link to={user ? '/app/development' : '/signup?next=/app/development'} className={buttonStyles({ size: 'lg' })}>
              {user ? 'Open the workspace' : 'Start a project plan'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/services" className={buttonStyles({ size: 'lg', variant: 'outline' })}>
              Request expert help
            </Link>
          </>
        }
      />

      <section className="container-page py-20">
        <SectionHeading
          eyebrow="The workflow"
          title="Gather context before generating answers."
          description="A useful proposal needs more than a one-line idea. PeaceAI asks for the details that change scope, cost, and risk."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: MessageSquare,
              step: '01',
              title: 'Describe the problem',
              text: 'Explain what you want to build, who it serves, and what success looks like.',
            },
            {
              icon: ClipboardList,
              step: '02',
              title: 'Define constraints',
              text: 'Add objectives, must-have features, technologies, budget assumptions, and timing.',
            },
            {
              icon: Sparkles,
              step: '03',
              title: 'Generate a draft',
              text: 'Receive a structured proposal with milestones, risks, open questions, and starter structure.',
            },
            {
              icon: GitBranch,
              step: '04',
              title: 'Refine the scope',
              text: 'Edit the proposal, resolve open questions, and save versions to your account.',
            },
            {
              icon: Code2,
              step: '05',
              title: 'Prepare to build',
              text: 'Use the starter structure and technical recommendations as a starting point for implementation.',
            },
            {
              icon: ShieldCheck,
              step: '06',
              title: 'Validate before launch',
              text: 'Review generated code, test critical flows, and request a professional security assessment.',
            },
          ].map((item) => (
            <div key={item.step} className="relative card-surface p-6">
              <span className="font-mono text-[11px] text-accent">{item.step}</span>
              <item.icon className="mt-4 h-5 w-5 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              align="left"
              eyebrow="What you receive"
              title="A plan you can question — not a promise you cannot verify."
            />
            <div className="mt-7 space-y-3">
              {[
                'Project overview and measurable objectives',
                'Target users and core user journeys',
                'Prioritized feature list',
                'Suggested technologies and trade-offs',
                'Milestones, deliverables, and estimated timeline',
                'Budget assumptions and quotation factors',
                'Risks, dependencies, and open questions',
                'Starter file and folder structure',
              ].map((item) => (
                <p key={item} className="flex gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {item}
                </p>
              ))}
            </div>
            <div className="mt-7 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-xs leading-5 text-amber-200/70">
              Generated proposals are planning drafts. AI can make mistakes and cannot guarantee
              correctness, security, or production readiness. Quotations become binding only after
              administrator approval.
            </div>
          </div>
          <div className="card-surface p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-white">Proposal outline</span>
              </div>
              <Badge tone="amber">Draft</Badge>
            </div>
            <div className="mt-5 space-y-3 font-mono text-xs">
              {[
                ['title', '"Inventory tracking portal"'],
                ['targetUsers', '["Warehouse staff", "Managers"]'],
                ['milestones', '4 planned'],
                ['technologies', '["React", "PostgreSQL"]'],
                ['openQuestions', '3 items'],
                ['assumptions', 'Documented'],
              ].map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4 border-b border-white/[0.05] pb-3">
                  <span className="text-sky-300">{key}</span>
                  <span className="text-right text-slate-400">{value}</span>
                </div>
              ))}
            </div>
            <Link to={user ? '/app/development' : '/signup'} className={buttonStyles({ className: 'mt-6 w-full' })}>
              Create a real proposal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
          <Badge tone="blue">Human review available</Badge>
          <h2 className="mt-4 text-2xl font-semibold">Need a quotation instead of a draft?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Submit your proposal or service request to the PeaceAI team. A person will review scope,
            dependencies, delivery risk, and pricing before issuing a quotation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/services" className={buttonStyles()}>
              Browse services
            </Link>
            <Link to="/contact" className={buttonStyles({ variant: 'outline' })}>
              Ask a question
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
