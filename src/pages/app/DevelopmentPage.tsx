import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Download,
  FileText,
  Plus,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { generateProposal } from '@/lib/ai'
import {
  deleteProposal,
  listProposalShares,
  listProposals,
  revokeProposalShare,
  saveProposal,
  shareProposal,
} from '@/lib/repository'
import { downloadTextFile, formatDate, getErrorMessage } from '@/lib/utils'
import type { ProjectProposal, ProjectSpec } from '@/types/domain'

interface GeneratedDraft {
  title: string
  summary: string
  spec: ProjectSpec
  generatedByAi: boolean
}

const initialForm = {
  description: '',
  objectives: '',
  audience: '',
  features: '',
  technologies: '',
  budget: '',
  timeline: '',
}

export function DevelopmentPage() {
  const { user, isPreview } = useAuth()
  const { toast } = useToast()
  const [proposals, setProposals] = useState<ProjectProposal[]>([])
  const [selected, setSelected] = useState<ProjectProposal | null>(null)
  const [draft, setDraft] = useState<GeneratedDraft | null>(null)
  const [form, setForm] = useState(initialForm)
  const [mode, setMode] = useState<'list' | 'form' | 'preview' | 'view'>('list')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ProjectProposal | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [shareTarget, setShareTarget] = useState<ProjectProposal | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [shares, setShares] = useState<Array<Record<string, any>>>([])
  const [sharing, setSharing] = useState(false)
  const [sharesLoading, setSharesLoading] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSummary, setDraftSummary] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    listProposals(user.id)
      .then((rows) => {
        if (!active) return
        setProposals(rows)
        if (rows.length) {
          setSelected(rows[0])
          setMode('view')
        }
      })
      .catch((err) => toast({ title: 'Could not load proposals', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user, toast])

  if (!user) return null

  const resetToForm = () => {
    setForm(initialForm)
    setDraft(null)
    setDraftTitle('')
    setDraftSummary('')
    setError('')
    setSelected(null)
    setMode('form')
  }

  const generate = async (event: FormEvent) => {
    event.preventDefault()
    if (form.description.trim().length < 40) {
      setError('Describe the project in at least 40 characters so the proposal has enough context.')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const result = await generateProposal({
        userId: user.id,
        description: form.description.trim(),
        objectives: form.objectives,
        audience: form.audience,
        features: form.features,
        technologies: form.technologies,
        budget: form.budget,
        timeline: form.timeline,
      })
      setDraft(result)
      setDraftTitle(result.title)
      setDraftSummary(result.summary)
      setMode('preview')
    } catch (err) {
      setError(getErrorMessage(err, 'The proposal could not be generated.'))
    } finally {
      setGenerating(false)
    }
  }

  const persistDraft = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const saved = await saveProposal(user.id, {
        title: draftTitle.trim() || 'Untitled project',
        summary: draftSummary.trim(),
        status: 'draft',
        spec: draft.spec,
      })
      setProposals((current) => [saved, ...current])
      setSelected(saved)
      setMode('view')
      setDraft(null)
      toast({ title: 'Proposal saved', description: 'It is now available in your account.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not save proposal', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const removeProposal = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProposal(deleteTarget.id)
      setProposals((current) => current.filter((item) => item.id !== deleteTarget.id))
      if (selected?.id === deleteTarget.id) {
        setSelected(null)
        setMode('list')
      }
      setDeleteTarget(null)
      toast({ title: 'Proposal deleted', tone: 'success' })
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const openShare = async (proposal: ProjectProposal) => {
    setShareTarget(proposal)
    setShares([])
    setSharesLoading(true)
    try {
      setShares(await listProposalShares(proposal.id))
    } catch (err) {
      toast({ title: 'Could not load sharing', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSharesLoading(false)
    }
  }

  const submitShare = async (event: FormEvent) => {
    event.preventDefault()
    if (!shareTarget || !shareEmail.trim()) return
    setSharing(true)
    try {
      await shareProposal(shareTarget.id, user.id, shareEmail.trim())
      setShares(await listProposalShares(shareTarget.id))
      setShareEmail('')
      toast({ title: 'Proposal shared', description: 'The recipient can now view this proposal.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Share failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSharing(false)
    }
  }

  const revoke = async (shareId: string) => {
    try {
      await revokeProposalShare(shareId)
      if (shareTarget) setShares(await listProposalShares(shareTarget.id))
      toast({ title: 'Access revoked', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not revoke access', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const exportProposal = (proposal: ProjectProposal) => {
    downloadTextFile(`${proposal.title.replace(/\s+/g, '-').toLowerCase()}.md`, proposalToMarkdown(proposal), 'text/markdown')
  }

  return (
    <div>
      <PageHeader
        title="AI Development"
        description="Turn a project description into a structured proposal. Review assumptions, resolve open questions, then request a human quotation."
        actions={
          <Button size="sm" onClick={resetToForm}>
            <Plus className="h-4 w-4" /> New proposal
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="card-surface h-fit p-3">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-medium text-slate-300">Your proposals</p>
            <span className="text-[10px] text-slate-600">{proposals.length}</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : proposals.length ? (
            <div className="space-y-1">
              {proposals.map((proposal) => (
                <button
                  key={proposal.id}
                  type="button"
                  onClick={() => {
                    setSelected(proposal)
                    setMode('view')
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                    selected?.id === proposal.id && mode === 'view' ? 'bg-accent/10' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <p className="truncate text-xs font-medium text-slate-200">{proposal.title}</p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {proposal.user_id === user.id ? 'Owned by you' : 'Shared with you'} · {formatDate(proposal.updated_at)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-8 text-center">
              <FileText className="mx-auto h-6 w-6 text-slate-600" />
              <p className="mt-2 text-xs text-slate-500">No proposals yet.</p>
              <button type="button" onClick={resetToForm} className="mt-2 text-xs font-medium text-accent">
                Create your first
              </button>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          {mode === 'list' ? (
            <EmptyState
              icon={Code2}
              title="Start with a project description"
              description="Tell PeaceAI what you want to build, who it is for, and the constraints you already know. The result is a draft plan, not a binding quotation."
              action={<Button onClick={resetToForm}><Sparkles className="h-4 w-4" /> Create a proposal</Button>}
            />
          ) : mode === 'form' ? (
            <form onSubmit={generate} className="card-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Describe the project</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    The more context you provide, the more useful the draft. Missing details become explicit assumptions.
                  </p>
                </div>
                <Badge tone="amber">Planning draft</Badge>
              </div>
              <div className="mt-6 space-y-4">
                <Textarea
                  label="Project description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={5}
                  required
                  minLength={40}
                  maxLength={5000}
                  hint={`${form.description.length}/5000 · Include the problem, current process, and desired outcome.`}
                  placeholder="Example: A district youth office needs a secure platform to register trainers, verify their skills, search by location, and track requests from partner organizations…"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Textarea
                    label="Objectives"
                    value={form.objectives}
                    onChange={(event) => setForm({ ...form, objectives: event.target.value })}
                    rows={3}
                    optional
                    placeholder="Reduce time spent finding trainers; centralize verification…"
                  />
                  <Textarea
                    label="Target users"
                    value={form.audience}
                    onChange={(event) => setForm({ ...form, audience: event.target.value })}
                    rows={3}
                    optional
                    placeholder="Program coordinators, trainers, partner organizations…"
                  />
                  <Textarea
                    label="Must-have features"
                    value={form.features}
                    onChange={(event) => setForm({ ...form, features: event.target.value })}
                    rows={3}
                    optional
                    placeholder="Profiles, search, approval workflow, reporting…"
                  />
                  <Textarea
                    label="Preferred technologies"
                    value={form.technologies}
                    onChange={(event) => setForm({ ...form, technologies: event.target.value })}
                    rows={3}
                    optional
                    placeholder="React, Supabase, PostgreSQL…"
                  />
                  <Input
                    label="Budget assumptions"
                    value={form.budget}
                    onChange={(event) => setForm({ ...form, budget: event.target.value })}
                    optional
                    placeholder="Example: planning around RWF 2,000,000"
                  />
                  <Input
                    label="Preferred timeline"
                    value={form.timeline}
                    onChange={(event) => setForm({ ...form, timeline: event.target.value })}
                    optional
                    placeholder="Example: launch in 8 weeks"
                  />
                </div>
                {error ? (
                  <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs text-rose-300" role="alert">{error}</p>
                ) : null}
                <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3.5 text-xs leading-5 text-amber-100/70">
                  Generated plans may be incomplete or wrong. No timeline, budget, or security guarantee is
                  provided. Final pricing requires administrator review and a written quotation.
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={() => setMode(proposals.length ? 'view' : 'list')}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" loading={generating}>
                    <Sparkles className="h-4 w-4" /> Generate proposal
                  </Button>
                </div>
              </div>
            </form>
          ) : mode === 'preview' && draft ? (
            <div className="space-y-4">
              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Review the generated draft</h2>
                  <Badge tone={draft.generatedByAi ? 'blue' : 'amber'}>
                    {draft.generatedByAi ? 'AI-generated draft' : 'Preview template'}
                  </Badge>
                </div>
                {!draft.generatedByAi ? (
                  <p className="mt-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3 text-xs leading-5 text-amber-100/70">
                    No AI provider is connected. This is a deterministic local template based on your
                    input, not an AI-generated proposal.
                  </p>
                ) : null}
                <div className="mt-5 space-y-4">
                  <Input label="Proposal title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={140} />
                  <Textarea label="Summary" value={draftSummary} onChange={(event) => setDraftSummary(event.target.value)} rows={3} maxLength={600} />
                </div>
              </div>
              <ProposalSpecView spec={draft.spec} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setMode('form')}>
                  <ArrowLeft className="h-4 w-4" /> Edit inputs
                </Button>
                <Button onClick={() => void persistDraft()} loading={saving}>
                  <Check className="h-4 w-4" /> Save proposal
                </Button>
              </div>
            </div>
          ) : mode === 'view' && selected ? (
            <div className="space-y-4">
              <div className="card-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="amber">{selected.status}</Badge>
                      {selected.user_id !== user.id ? <Badge tone="blue">Shared with you</Badge> : null}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold">{selected.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{selected.summary}</p>
                    <p className="mt-2 text-[11px] text-slate-600">Updated {formatDate(selected.updated_at, true)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportProposal(selected)}>
                      <Download className="h-4 w-4" /> Export
                    </Button>
                    {selected.user_id === user.id ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => void openShare(selected)}>
                          <Share2 className="h-4 w-4" /> Share
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(selected)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                {selected.user_id === user.id ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setForm({
                          ...initialForm,
                          description: selected.spec.overview,
                          objectives: selected.spec.objectives.join('\n'),
                          audience: selected.spec.targetUsers.join('\n'),
                          features: selected.spec.features.join('\n'),
                          technologies: selected.spec.technologies.join('\n'),
                          budget: selected.spec.budgetAssumptions,
                          timeline: selected.spec.estimatedTimeline,
                        })
                        setSelected(null)
                        setMode('form')
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Refine with a new draft
                    </Button>
                    <a href={`/services/custom-web-applications`} className={buttonStyles({ variant: 'outline', size: 'sm' })}>
                      Request a quotation <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}
              </div>
              <ProposalSpecView spec={selected.spec} />
              <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-xs leading-5 text-amber-100/70">
                This proposal is a draft. AI can make mistakes. Timelines, budgets, and technical
                choices require human review. PeaceAI does not guarantee that generated code is
                error-free, secure, or production-ready.
              </div>
            </div>
          ) : (
            <EmptyState icon={FileText} title="Select a proposal" description="Choose a saved proposal or create a new one." />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void removeProposal()}
        title="Delete this proposal?"
        description="This permanently deletes the proposal and revokes any shares. This action cannot be undone."
        confirmLabel="Delete proposal"
        destructive
        loading={deleting}
      />

      <Modal
        open={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        title="Share proposal"
        description="Share this proposal with another PeaceAI user by email. They receive read access only; they cannot edit or delete it."
      >
        <form onSubmit={submitShare} className="flex gap-2">
          <Input
            aria-label="Recipient email"
            type="email"
            value={shareEmail}
            onChange={(event) => setShareEmail(event.target.value)}
            placeholder="teammate@example.com"
            containerClassName="flex-1"
            required
          />
          <Button type="submit" loading={sharing} className="h-[42px]">
            <Send className="h-4 w-4" /> Share
          </Button>
        </form>
        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <h3 className="text-xs font-medium text-slate-300">People with access</h3>
          {sharesLoading ? (
            <div className="flex justify-center py-5"><Spinner /></div>
          ) : shares.length ? (
            <div className="mt-3 space-y-2">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-slate-300">{share.profile?.full_name || share.profile?.email || 'PeaceAI user'}</span>
                  </div>
                  <button type="button" onClick={() => void revoke(share.id)} className="text-[11px] text-rose-300 hover:text-rose-200">
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Only you have access right now.</p>
          )}
        </div>
        {isPreview ? (
          <p className="mt-4 text-[10px] leading-4 text-slate-600">
            Preview shares apply only to local browser data. In production, sharing is enforced by database policies.
          </p>
        ) : null}
      </Modal>
    </div>
  )
}

function ProposalSpecView({ spec }: { spec: ProjectSpec }) {
  return (
    <div className="space-y-4">
      <div className="card-surface p-5 sm:p-6">
        <h3 className="text-sm font-semibold">Overview</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-400">{spec.overview}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SpecList title="Objectives" items={spec.objectives} />
        <SpecList title="Target users" items={spec.targetUsers} />
        <SpecList title="Features" items={spec.features} />
        <SpecList title="Technologies" items={spec.technologies} />
      </div>
      <div className="card-surface p-5 sm:p-6">
        <h3 className="text-sm font-semibold">Milestones</h3>
        {spec.milestones.length ? (
          <div className="mt-4 space-y-3">
            {spec.milestones.map((milestone, index) => (
              <div key={`${milestone.name}-${index}`} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{index + 1}. {milestone.name}</p>
                  <Badge tone="blue">{milestone.duration}</Badge>
                </div>
                <ul className="mt-2 space-y-1">
                  {milestone.deliverables.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-slate-400">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No structured milestones were generated.</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Estimated timeline</p>
            <p className="mt-1 text-sm text-slate-300">{spec.estimatedTimeline}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Budget assumptions</p>
            <p className="mt-1 text-sm text-slate-300">{spec.budgetAssumptions}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SpecList title="Risks" items={spec.risks} tone="rose" />
        <SpecList title="Open questions" items={spec.openQuestions} tone="amber" />
      </div>
      {spec.starterStructure ? (
        <div className="card-surface p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Code2 className="h-4 w-4 text-accent" /> Starter structure</h3>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-ink-950 p-4 font-mono text-xs leading-6 text-slate-400">{spec.starterStructure}</pre>
          <p className="mt-2 text-[10px] text-slate-600">Structure only. No generated code is executed automatically.</p>
        </div>
      ) : null}
    </div>
  )
}

function SpecList({ title, items, tone = 'accent' }: { title: string; items: string[]; tone?: 'accent' | 'rose' | 'amber' }) {
  const colors = {
    accent: 'text-accent',
    rose: 'text-rose-300',
    amber: 'text-amber-300',
  }
  return (
    <div className="card-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-5 text-slate-400">
              <span className={`mt-2 h-1 w-1 shrink-0 rounded-full ${tone === 'rose' ? 'bg-rose-300' : tone === 'amber' ? 'bg-amber-300' : 'bg-accent'}`} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">Not specified.</p>
      )}
      <span className={`mt-3 block text-[10px] ${colors[tone]}`}>{items.length} item{items.length === 1 ? '' : 's'}</span>
    </div>
  )
}

function proposalToMarkdown(proposal: ProjectProposal) {
  const s = proposal.spec
  return [
    `# ${proposal.title}`,
    '',
    proposal.summary,
    '',
    '## Overview',
    s.overview,
    '',
    '## Objectives',
    ...s.objectives.map((item) => `- ${item}`),
    '',
    '## Target users',
    ...s.targetUsers.map((item) => `- ${item}`),
    '',
    '## Features',
    ...s.features.map((item) => `- ${item}`),
    '',
    '## Technologies',
    ...s.technologies.map((item) => `- ${item}`),
    '',
    '## Milestones',
    ...s.milestones.flatMap((milestone) => [
      `### ${milestone.name} (${milestone.duration})`,
      ...milestone.deliverables.map((item) => `- ${item}`),
      '',
    ]),
    '## Timeline',
    s.estimatedTimeline,
    '',
    '## Budget assumptions',
    s.budgetAssumptions,
    '',
    '## Risks',
    ...s.risks.map((item) => `- ${item}`),
    '',
    '## Open questions',
    ...s.openQuestions.map((item) => `- ${item}`),
    '',
    '---',
    'Draft generated with PeaceAI. Not a binding quotation. Human review required.',
  ].join('\n')
}
