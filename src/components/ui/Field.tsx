import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-xl border border-white/10 bg-ink-950/70 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors hover:border-white/20 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50'

export function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string
  children: ReactNode
  optional?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-200">
      {children}
      {optional ? <span className="ml-1 font-normal text-slate-500">(optional)</span> : null}
    </label>
  )
}

interface FieldWrapperProps {
  label?: string
  hint?: string
  error?: string
  optional?: boolean
  id: string
  children: ReactNode
  className?: string
}

function FieldWrapper({ label, hint, error, optional, id, children, className }: FieldWrapperProps) {
  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={id} optional={optional}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  optional?: boolean
  containerClassName?: string
  leadingIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, optional, id, className, containerClassName, leadingIcon, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        optional={optional}
        id={fieldId}
        className={containerClassName}
      >
        {leadingIcon ? (
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              {leadingIcon}
            </span>
            <input
              ref={ref}
              id={fieldId}
              className={cn(fieldBase, 'pl-10', error && 'border-rose-500/60', className)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
              {...props}
            />
          </div>
        ) : (
          <input
            ref={ref}
            id={fieldId}
            className={cn(fieldBase, error && 'border-rose-500/60', className)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
            {...props}
          />
        )}
      </FieldWrapper>
    )
  },
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  optional?: boolean
  containerClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, optional, id, className, containerClassName, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        optional={optional}
        id={fieldId}
        className={containerClassName}
      >
        <textarea
          ref={ref}
          id={fieldId}
          className={cn(fieldBase, 'min-h-28 resize-y', error && 'border-rose-500/60', className)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...props}
        />
      </FieldWrapper>
    )
  },
)
Textarea.displayName = 'Textarea'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  optional?: boolean
  containerClassName?: string
  options?: Array<{ value: string; label: string; disabled?: boolean }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, optional, id, className, containerClassName, children, options, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        optional={optional}
        id={fieldId}
        className={containerClassName}
      >
        <select
          ref={ref}
          id={fieldId}
          className={cn(fieldBase, 'appearance-none pr-9', className)}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled} className="bg-ink-900">
                  {option.label}
                </option>
              ))
            : children}
        </select>
      </FieldWrapper>
    )
  },
)
Select.displayName = 'Select'
