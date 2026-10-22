import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5 rounded-lg focus-ring', className)}
      aria-label="PeaceAI home"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-sky-400/10 ring-1 ring-accent/30">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M10 24V8h7.5a5.5 5.5 0 0 1 0 11H14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          />
          <circle cx="23" cy="22" r="2" className="fill-sky-400" />
        </svg>
      </span>
      {!compact ? (
        <span className="font-display text-[1.15rem] font-semibold tracking-tight text-white">
          Peace<span className="text-accent">AI</span>
        </span>
      ) : null}
    </Link>
  )
}
