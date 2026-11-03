import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5 rounded-lg focus-ring', className)}
      aria-label="PeaceAI home"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-[0.85rem] bg-gradient-to-br from-accent/30 via-iris/20 to-transparent ring-1 ring-accent/35">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M9 24V8h8a5 5 0 0 1 0 10h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          />
          <circle cx="23" cy="22" r="2.1" className="fill-iris" />
          <path d="M23 9h1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-iris" />
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
