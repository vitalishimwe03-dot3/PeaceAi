import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-ink-950 shadow-[0_10px_32px_-12px_rgba(255,138,76,.7)] hover:bg-accent-light active:bg-accent-dark disabled:bg-accent/40',
  secondary: 'bg-content-strong text-surface-page hover:bg-content-strong/90 disabled:opacity-50',
  outline: 'border border-line-strong bg-field text-content-strong hover:border-line-strong hover:bg-field-hover',
  ghost: 'text-content-muted hover:bg-field-hover hover:text-content-strong',
  danger: 'bg-rose-500/90 text-white hover:bg-rose-500',
  soft: 'bg-accent/10 text-accent-dark hover:bg-accent/15 dark:text-accent',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
  icon: 'h-10 w-10',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant
  size?: Size
  className?: string
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
