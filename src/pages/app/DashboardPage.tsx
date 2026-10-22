import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Code2,
  Files,
  Gauge,
  HardDrive,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, Progress, StatCard } from '@/components/layout/PageHeader'
import { buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  getEffectivePlan,
  getUsageSummary,
  listConversations,
  listFiles,
  listProposals,
  listServiceRequests,
} from '@/lib/repository'
import { formatBytes, formatDate, relativeTime } from '@/lib/utils'
import type {
  Conversation,
  Plan,
  ProjectProposal,
  ServiceRequest,
  StoredFile,
  UsageSummary,
} from '@/types/domain'

export function DashboardPage() {
  const { user, isPreview, configured } = useAuth()
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [files, setFiles] = useState<StoredFile[]>([])
  const [proposals, setProposals] = useState<ProjectProposal[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      getUsageSummary(user.id),
      getEffectivePlan(user.id),
      listConversations(user.id),
      listFiles(user.id),
      listProposals(user.id),
      listServiceRequests(user.id),
    ])
      .then(([usageResult, planResult, conversationResult, fileResult, proposalResult, requestResult]) => {
        if (!active) return
        setUsage(usageResult)
        setPlan(planResult)
        setConversations(conversationResult)
        setFiles(fileResult)
        setProposals(proposalResult)
        setRequests(requestResult)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  if (!user) return null

  const firstName = (user.profile.full_name || user.email).split(/\s+/)[0]

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${firstName}.`}
        description="Here is what is happening in your workspace. Limits and usage are calculated from your account records."
        actions={
          <>
            <Link to="/app/assistant?new=1" className={buttonStyles({ size: 'sm' })}>
              <Plus className="h-4 w-4" /> New conversation
            </Link>
            <Link to="/app/development" className={buttonStyles({ size: 'sm', variant: 'outline' })}>
              <Code2 className="h-4 w-4" /> Plan a project
            </Link>
          </>
        }
      />

      {loading || !usage || !plan ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Spinner label="Loading dashboard" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="AI messages today"
              value={`${usage.messagesToday} / ${usage.messagesLimit}`}
              detail={`Resets at midnight · ${usage.planName} plan`}
              icon={MessageSquare}
            />
            <StatCard
              label="Storage used"
              value={formatBytes(usage.storageUsed)}
              detail={`of ${formatBytes(usage.storageQuota)} included`}
              icon={HardDrive}
              tone="blue"
            />
            <StatCard
              label="Saved conversations"
              value={String(conversations.length)}
              detail={`${conversations.filter((conversation) => conversation.status === 'archived').length} archived`}
              icon={Bot}
              tone="violet"
            />
            <StatCard
              label="Project proposals"
              value={String(proposals.length)}
              detail={`${usage.proposalsThisMonth} generated this month`}
              icon={Code2}
              tone="amber"
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="card-surface p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Recent conversations</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Continue where you left off.</p>
                </div>
                <Link to="/app/assistant" className="text-xs font-medium text-accent hover:text-accent-light">
                  View all
                </Link>
              </div>
              <div className="mt-4 divide-y divide-white/[0.06]">
                {conversations.length ? (
                  conversations.slice(0, 5).map((conversation) => (
                    <Link
                      key={conversation.id}
                      to={`/app/assistant?conversation=${conversation.id}`}
                      className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-200">{conversation.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {conversation.model || 'Standard model'} · {relativeTime(conversation.updated_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {conversation.status === 'archived' ? <Badge tone="neutral">Archived</Badge> : null}
                        <ArrowRight className="h-4 w-4 text-slate-600" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-400">No conversations yet.</p>
                    <Link to="/app/assistant?new=1" className="mt-2 inline-flex text-xs font-medium text-accent">
                      Start your first conversation →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Plan usage</h2>
                <Badge tone="accent">{usage.planName}</Badge>
              </div>
              <div className="mt-5 space-y-5">
                <Progress
                  value={usage.messagesToday}
                  max={usage.messagesLimit}
                  label={`AI messages · ${usage.messagesToday}/${usage.messagesLimit}`}
                  tone={usage.messagesToday / Math.max(usage.messagesLimit, 1) > 0.85 ? 'amber' : 'accent'}
                />
                <Progress
                  value={usage.storageUsed}
                  max={usage.storageQuota}
                  label={`Storage · ${formatBytes(usage.storageUsed)} / ${formatBytes(usage.storageQuota)}`}
                  tone={usage.storageUsed / Math.max(usage.storageQuota, 1) > 0.9 ? 'rose' : 'accent'}
                />
                <Progress
                  value={usage.proposalsThisMonth}
                  max={usage.proposalsLimit}
                  label={`Proposals this month · ${usage.proposalsThisMonth}/${usage.proposalsLimit}`}
                  tone="accent"
                />
                <Progress
                  value={0}
                  max={usage.requestsPerMinuteLimit}
                  label={`Rate limit · ${usage.requestsPerMinuteLimit} requests/minute`}
                  tone="accent"
                />
              </div>
              <Link to="/app/usage" className={buttonStyles({ variant: 'outline', size: 'sm', className: 'mt-5 w-full' })}>
                <Gauge className="h-4 w-4" /> View usage details
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Recent files</h2>
                <Link to="/app/storage" className="text-xs text-accent">Open storage</Link>
              </div>
              <div className="mt-4 space-y-3">
                {files.slice(0, 4).map((file) => (
                  <div key={file.id} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                      <Files className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">{file.name}</p>
                      <p className="text-[10px] text-slate-500">{formatBytes(file.size_bytes)} · {formatDate(file.created_at)}</p>
                    </div>
                  </div>
                ))}
                {!files.length ? <p className="py-4 text-center text-xs text-slate-500">No files uploaded yet.</p> : null}
              </div>
            </div>

            <div className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Project drafts</h2>
                <Link to="/app/development" className="text-xs text-accent">New proposal</Link>
              </div>
              <div className="mt-4 space-y-3">
                {proposals.slice(0, 3).map((proposal) => (
                  <Link key={proposal.id} to="/app/development" className="block rounded-lg border border-white/[0.06] p-3 hover:border-white/15">
                    <p className="truncate text-xs font-medium text-slate-200">{proposal.title}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{proposal.spec.estimatedTimeline}</span>
                      <Badge tone="amber">{proposal.status}</Badge>
                    </div>
                  </Link>
                ))}
                {!proposals.length ? <p className="py-4 text-center text-xs text-slate-500">No proposals yet.</p> : null}
              </div>
            </div>

            <div className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Service requests</h2>
                <Link to="/app/services" className="text-xs text-accent">View all</Link>
              </div>
              <div className="mt-4 space-y-3">
                {requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="rounded-lg border border-white/[0.06] p-3">
                    <p className="truncate text-xs font-medium text-slate-200">{request.service?.name ?? 'Service request'}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{formatDate(request.created_at)}</span>
                      <Badge tone={request.status === 'completed' ? 'accent' : 'blue'}>{request.status}</Badge>
                    </div>
                  </div>
                ))}
                {!requests.length ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-500">No requests yet.</p>
                    <Link to="/services" className="mt-2 inline-flex text-xs font-medium text-accent">Browse services →</Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-accent" /> Security reminder
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                AI-generated code and project plans can contain mistakes. Test critical flows and
                have high-impact systems reviewed before production. Never share passwords or secrets
                in a conversation or file.
              </p>
              <Link to="/cybersecurity" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
                Explore security services <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-accent" /> Integration status
              </h2>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Database and authentication</span>
                  <Badge tone={configured ? 'accent' : 'amber'}>{configured ? 'Connected' : 'Preview'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">AI provider</span>
                  <Badge tone={configured ? 'blue' : 'neutral'}>{configured ? 'Server configured?' : 'Not connected'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Payments</span>
                  <Badge tone="neutral">{isPreview ? 'Not configured' : 'Check admin configuration'}</Badge>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-slate-600">
                AI and payment status are determined by server-side configuration, not by this badge.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
