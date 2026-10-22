import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Bug,
  Check,
  Code2,
  FileText,
  Lightbulb,
  Lock,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHero, SectionHeading } from '@/components/marketing/PageHero'
import { buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const capabilities = [
  { icon: MessageSquare, title: 'Reason through problems', text: 'Explore options, ask follow-up questions, and turn an unclear brief into concrete next steps.' },
  { icon: Code2, title: 'Generate and explain code', text: 'Work across common programming languages with syntax-highlighted answers and copy-ready blocks.' },
  { icon: Bug, title: 'Debug and analyze errors', text: 'Share stack traces, logs, or failing code and get a structured investigation path.' },
  { icon: FileText, title: 'Summarize and draft', text: 'Attach supported text and code files to summarize requirements, draft documentation, or extract tasks.' },
  { icon: Lightbulb, title: 'Plan software projects', text: 'Turn an idea into a proposal with features, assumptions, milestones, risks, and open questions.' },
  { icon: BookOpen, title: 'Use approved knowledge', text: 'When administrators configure retrieval, answers can cite approved internal documents.' },
]

export function AssistantLandingPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHero
        eyebrow="AI Assistant"
        title={<>A thinking partner for the work that matters.</>}
        description="Conversations for code, planning, debugging, writing, and technical decisions — saved, searchable, and protected by authenticated server-side calls."
        actions={
          <>
            <Link to={user ? '/app/assistant' : '/signup?next=/app/assistant'} className={buttonStyles({ size: 'lg' })}>
              {user ? 'Open the assistant' : 'Start free'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className={buttonStyles({ size: 'lg', variant: 'outline' })}>
              Compare plans
            </Link>
          </>
        }
      />

      <section className="container-page py-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <div key={capability.title} className="card-surface p-6">
              <capability.icon className="h-5 w-5 text-accent" />
              <h2 className="mt-4 text-base font-semibold">{capability.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{capability.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Built for real work"
              title="Start with a prompt. Leave with a plan."
              description="The assistant is designed to make its uncertainty visible. It asks for missing detail, states assumptions, and marks generated work as a draft."
            />
            <div className="mt-7 space-y-3">
              {[
                'Create, rename, archive, and delete conversations',
                'Copy answers and code blocks with one click',
                'Attach text, source code, JSON, CSV, and Markdown',
                'Choose an available standard or premium model',
                'See usage limits before you hit them',
                'Retain conversation history in your account',
              ].map((item) => (
                <p key={item} className="flex gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {item}
                </p>
              ))}
            </div>
          </div>
          <div className="card-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Example prompts
              </div>
              <Badge tone="accent">Draft guidance</Badge>
            </div>
            <div className="space-y-2 p-4">
              {[
                'Review this authentication design for missing authorization checks.',
                'Create a 6-week plan for a community events platform with a small budget.',
                'Explain why this SQL query is slow and propose safer alternatives.',
                'Summarize these requirements and list open questions for the client.',
                'Design a secure file-sharing model where private files stay private.',
              ].map((prompt) => (
                <div key={prompt} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
                  {prompt}
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.07] p-4">
              <Link to={user ? '/app/assistant' : '/signup'} className={buttonStyles({ className: 'w-full' })}>
                Try it in your workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Lock, title: 'Protected provider calls', text: 'AI keys stay in server-side secrets. The browser never receives provider credentials.' },
            { icon: ShieldAlert, title: 'Clear limitations', text: 'AI can be wrong. Generated code and plans require human review, testing, and security validation.' },
            { icon: FileText, title: 'Private history', text: 'Row-level security limits each conversation to its owner. Archived conversations stay under your control.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <item.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-slate-600">
          PeaceAI does not claim to have trained its own foundation model. The platform uses
          configurable third-party model providers through its protected backend.
        </p>
      </section>
    </>
  )
}
