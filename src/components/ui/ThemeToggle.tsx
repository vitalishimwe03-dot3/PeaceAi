import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

/**
 * Compact icon button for headers and sidebars. With `showSystem` it also
 * offers "follow system"; otherwise it simply flips light ↔ dark.
 */
export function ThemeToggle({
  className,
  showSystem = false,
  size = 'md',
}: {
  className?: string
  showSystem?: boolean
  size?: 'sm' | 'md'
}) {
  const { preference, resolved, setPreference, toggle } = useTheme()

  const order: ThemePreference[] = showSystem ? ['light', 'dark', 'system'] : ['light', 'dark']
  const next = () => {
    if (!showSystem) return toggle()
    const index = order.indexOf(preference)
    setPreference(order[(index + 1) % order.length])
  }

  const active: ThemePreference = preference === 'system' ? 'system' : resolved
  const Icon = active === 'dark' ? Moon : active === 'light' ? Sun : Monitor
  const label =
    showSystem
      ? `Theme: ${preference === 'system' ? 'system' : active}. Switch theme`
      : `Theme: ${active}. Switch to ${active === 'dark' ? 'light' : 'dark'}`

  return (
    <button
      type="button"
      onClick={next}
      className={cn(
        'inline-flex items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-field hover:text-content-strong focus-ring',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[1.125rem] w-[1.125rem]'} aria-hidden="true" />
    </button>
  )
}

/** Segmented Light / Dark / System control for settings screens. */
export function ThemePicker({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun; hint: string }> = [
    { value: 'light', label: 'Light', icon: Sun, hint: 'Always use the light theme.' },
    { value: 'dark', label: 'Dark', icon: Moon, hint: 'Always use the dark theme.' },
    { value: 'system', label: 'System', icon: Monitor, hint: 'Match this device automatically.' },
  ]

  return (
    <div className={cn('grid gap-2 sm:grid-cols-3', className)} role="radiogroup" aria-label="Theme">
      {options.map((option) => {
        const selected = preference === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(option.value)}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3 text-left text-xs transition-colors focus-ring',
              selected
                ? 'border-accent/50 bg-accent/[0.08] text-content-strong'
                : 'border-line bg-field text-content-muted hover:bg-field-hover',
            )}
          >
            <option.icon
              className={cn('mt-0.5 h-4 w-4 shrink-0', selected ? 'text-accent' : 'text-content-subtle')}
              aria-hidden="true"
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              <span className="mt-0.5 block leading-5 text-content-subtle">{option.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
