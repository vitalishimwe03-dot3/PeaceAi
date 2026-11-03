import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('relative overflow-hidden border-b border-white/[0.06]', className)}>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-accent/[0.12] blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-iris/[0.12] blur-3xl" aria-hidden="true" />
      <div className="container-page relative py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-end">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.06] sm:text-5xl lg:text-[3.6rem]">
              {title}
            </h1>
            {description ? (
              <div className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                {description}
              </div>
            ) : null}
            {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
            {children}
          </div>
          <div className="relative hidden lg:block" aria-hidden="true">
            <div className="absolute -inset-3 rounded-[1.8rem] bg-gradient-to-br from-accent/20 via-transparent to-iris/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-ink-900/70 p-5 shadow-card backdrop-blur">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <span>PeaceAI</span>
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="h-2 w-3/4 rounded-full bg-white/15" />
                <div className="h-2 w-1/2 rounded-full bg-white/10" />
                <div className="h-16 rounded-xl border border-white/[0.07] bg-gradient-to-br from-accent/[0.12] to-iris/[0.06]" />
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="h-12 rounded-lg border border-white/[0.07] bg-white/[0.03]" />
                  <div className="h-12 rounded-lg border border-white/[0.07] bg-white/[0.03]" />
                </div>
              </div>
              <p className="mt-5 font-mono text-[10px] text-slate-500">secure · reviewed · bounded</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'center' | 'left'
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-400">{description}</p>
      ) : null}
    </div>
  )
}
