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
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" aria-hidden="true" />
      <div className="container-page relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.35rem]">
            {title}
          </h1>
          {description ? (
            <div className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              {description}
            </div>
          ) : null}
          {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
          {children}
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
