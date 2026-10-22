import type { ComponentType, ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  detail,
  hint,
  icon,
  tone = 'accent',
}: {
  label: string
  value: string | number
  detail?: string
  hint?: string
  icon?: ComponentType<{ className?: string }> | ReactNode
  tone?: 'accent' | 'blue' | 'amber' | 'violet'
}) {
  const tones = {
    accent: 'bg-accent/10 text-accent',
    blue: 'bg-sky-400/10 text-sky-300',
    amber: 'bg-amber-400/10 text-amber-300',
    violet: 'bg-violet-400/10 text-violet-300',
  }
  const iconNode =
    typeof icon === 'function'
      ? (() => {
          const Icon = icon as ComponentType<{ className?: string }>
          return <Icon className="h-4.5 w-4.5" />
        })()
      : icon
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
          {detail || hint ? <p className="mt-1 text-[11px] text-slate-500">{detail ?? hint}</p> : null}
        </div>
        {iconNode ? (
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
            {iconNode}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function Progress({
  value,
  max,
  label,
  tone = 'accent',
}: {
  value: number
  max: number
  label?: string
  tone?: 'accent' | 'amber' | 'rose'
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const tones = {
    accent: 'bg-accent',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
  }
  return (
    <div>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-500">{percent}%</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${tones[tone]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
