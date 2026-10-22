import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center justify-center">
      <Loader2 className={cn('h-5 w-5 animate-spin text-accent', className)} aria-hidden="true" />
    </span>
  )
}

export function LoadingScreen({ label = 'Loading PeaceAI…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <Spinner className="h-7 w-7" label={label} />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}
