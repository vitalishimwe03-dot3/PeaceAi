import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5 rounded-lg focus-ring', className)}
      aria-label="PeaceAI home"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-[0.9rem] bg-ink-900 ring-1 ring-accent/30 shadow-[0_0_18px_rgba(52,227,176,0.12)]">
        <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
          <defs>
            <linearGradient id="logoAccent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34e3b0" />
              <stop offset="100%" stopColor="#47a9ff" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#logoAccent)" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="32" cy="32" r="11.5" strokeWidth="2.6" />
            <path d="M32 14v6.5M32 43.5V50M14 32h6.5M43.5 32H50M19.3 19.3l4.6 4.6M40.1 40.1l4.6 4.6M44.7 19.3l-4.6 4.6M23.9 40.1l-4.6 4.6" strokeWidth="2.1" opacity="0.9" />
          </g>
          <g fill="url(#logoAccent)">
            <circle cx="32" cy="32" r="3.3" />
            <circle cx="32" cy="14" r="2" />
            <circle cx="50" cy="32" r="2" />
            <circle cx="32" cy="50" r="2" />
            <circle cx="14" cy="32" r="2" />
          </g>
          <path d="M27.2 36.8V27.2h4.7a3.5 3.5 0 1 1 0 7h-2.2" fill="none" stroke="#eaf4ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M35.8 36.8l2.6-9.6" fill="none" stroke="#34e3b0" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
        </svg>
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="block font-display text-[1.12rem] font-semibold tracking-tight text-content-strong">
            Peace<span className="bg-gradient-to-r from-accent to-iris bg-clip-text text-transparent">AI</span>
          </span>
          <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.14em] text-content-subtle">Secure Knowledge AI</span>
        </span>
      ) : null}
    </Link>
  )
}