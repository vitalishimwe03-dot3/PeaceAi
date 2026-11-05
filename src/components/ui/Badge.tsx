import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'accent' | 'blue' | 'amber' | 'rose' | 'violet'

const tones: Record<Tone, string> = {
  neutral: 'border-line bg-field text-content-muted',
  accent: 'border-accent/20 bg-accent/10 text-accent-dark theme-dark:text-accent',
  blue: 'border-iris/25 bg-iris/10 text-iris-dark theme-dark:text-iris-light',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-700 theme-dark:text-amber-300',
  rose: 'border-rose-400/20 bg-rose-400/10 text-rose-600 theme-dark:text-rose-300',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-700 theme-dark:text-violet-300',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

export function statusTone(status: string): Tone {
  switch (status) {
    case 'active':
    case 'ready':
    case 'successful':
    case 'accepted':
    case 'completed':
      return 'accent'
    case 'pending':
    case 'processing':
    case 'queued':
    case 'reviewing':
    case 'submitted':
    case 'trialing':
      return 'blue'
    case 'suspended':
    case 'failed':
    case 'declined':
    case 'canceled':
    case 'cancelled':
    case 'past_due':
      return 'rose'
    default:
      return 'neutral'
  }
}
