import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Cpu, HardDrive, MessageSquare, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, Progress, StatCard } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getEffectivePlan, getUsageHistory, getUsageSummary, type DailyUsage } from '@/lib/repository'
import { formatBytes, getErrorMessage } from '@/lib/utils'
import type { Plan, UsageSummary } from '@/types/domain'

export function UsagePage() {
  const { user, isPreview } = useAuth()
  const { toast } = useToast()
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [history, setHistory] = useState<DailyUsage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([getUsageSummary(user.id), getEffectivePlan(user.id), getUsageHistory(user.id)])
      .then(([summary, currentPlan, rows]) => {
        setUsage(summary)
        setPlan(currentPlan)
        setHistory(rows)
      })
      .catch((err) => toast({ title: 'Could not load usage', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user) return null

  const chartData = history.map((row) => ({
    ...row,
    label: new Date(`${row.date}T00:00:00`).toLocaleDateString('en-RW', { month: 'short', day: 'numeric' }),
  }))

  return (
    <div>
      <PageHeader
        title="Usage"
        description="Understand your plan limits and AI consumption. Limits are enforced on the server for every request."
        actions={<Link to="/app/billing"><Button size="sm" variant="outline">Manage plan</Button></Link>}
      />

      {loading || !usage ? (
        <div className="flex justify-center py-20"><Spinner label="Loading usage" /></div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Current plan: <span className="font-medium text-slate-300">{plan?.name ?? usage.planName}</span>
            </p>
            {isPreview ? <Badge tone="amber">Preview data stored in this browser</Badge> : <Badge tone="neutral">Server-recorded usage</Badge>}
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="AI messages today"
              value={usage.messagesToday}
              hint={`Limit: ${usage.messagesLimit} per day`}
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <StatCard
              label="Tokens this month"
              value={usage.tokensThisMonth.toLocaleString('en-RW')}
              hint="Prompt and completion tokens recorded by the server"
              icon={<Cpu className="h-4 w-4" />}
            />
            <StatCard
              label="Proposals this month"
              value={usage.proposalsThisMonth}
              hint={`Limit: ${usage.proposalsLimit} per month`}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <StatCard
              label="Storage"
              value={formatBytes(usage.storageUsed)}
              hint={`of ${formatBytes(usage.storageQuota)} included`}
              icon={<HardDrive className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <section className="card-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-medium text-white"><Activity className="h-4 w-4 text-accent" /> AI requests</h2>
                    <p className="mt-1 text-[11px] text-slate-500">Last 14 days. One point per AI request recorded by the server.</p>
                  </div>
                </div>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="requestFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Area type="monotone" dataKey="requests" name="Requests" stroke="#34d399" strokeWidth={2} fill="url(#requestFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="card-surface p-5">
                <h2 className="text-sm font-medium text-white">Token consumption</h2>
                <p className="mt-1 text-[11px] text-slate-500">Token counts are estimates for local preview; connected providers report actual usage.</p>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tokenFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Area type="monotone" dataKey="tokens" name="Tokens" stroke="#38bdf8" strokeWidth={2} fill="url(#tokenFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="card-surface p-5">
                <h2 className="text-sm font-medium text-white">Limits</h2>
                <div className="mt-4 space-y-5">
                  <LimitRow
                    label="Daily messages"
                    value={usage.messagesToday}
                    max={usage.messagesLimit}
                    detail={`${Math.max(0, usage.messagesLimit - usage.messagesToday)} remaining today`}
                  />
                  <LimitRow
                    label="Monthly proposals"
                    value={usage.proposalsThisMonth}
                    max={usage.proposalsLimit}
                    detail={`${Math.max(0, usage.proposalsLimit - usage.proposalsThisMonth)} remaining this month`}
                  />
                  <LimitRow
                    label="Storage"
                    value={usage.storageUsed}
                    max={usage.storageQuota}
                    detail={`${formatBytes(Math.max(0, usage.storageQuota - usage.storageUsed))} free`}
                    format={formatBytes}
                  />
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Requests per minute</span>
                      <span className="text-slate-500">Limit {usage.requestsPerMinuteLimit}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-slate-600">
                      Short bursts are throttled with a clear retry message. The server enforces this per account, not just per browser.
                    </p>
                  </div>
                </div>
              </section>

              <section className="card-surface p-5">
                <h2 className="text-sm font-medium text-white">How limits work</h2>
                <ul className="mt-3 space-y-2.5 text-[11px] leading-5 text-slate-500">
                  <li>Daily message limits reset at midnight, Rwanda time (UTC+2).</li>
                  <li>Monthly proposal limits reset on the first day of each month.</li>
                  <li>Rejected requests and failed generations may still count if the provider processed them.</li>
                  <li>Reaching a limit never deletes your content. You can continue reading saved work.</li>
                  <li>Upgrades take effect only after the payment webhook is verified.</li>
                </ul>
                <Link to="/app/billing" className="mt-4 inline-flex text-[11px] text-accent hover:underline">Compare plans →</Link>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LimitRow({
  label,
  value,
  max,
  detail,
  format,
}: {
  label: string
  value: number
  max: number
  detail: string
  format?: (value: number) => string
}) {
  const display = format ?? ((input: number) => input.toLocaleString('en-RW'))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-500">{display(value)} / {display(max)}</span>
      </div>
      <div className="mt-2"><Progress value={value} max={max} tone={value / Math.max(max, 1) > 0.9 ? 'rose' : 'accent'} /></div>
      <p className="mt-1 text-[10px] text-slate-600">{detail}</p>
    </div>
  )
}
