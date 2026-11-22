'use client'

/**
 * Shared building blocks for every domain. They read only --d-* tokens, so they
 * look right inside whichever [data-domain] region they sit in. To mix domains
 * in one tool, wrap a region in <Region domain="workbench"> (see Region below).
 */
import { useState } from 'react'
import { Check, Copy, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Domain } from '@/config/domains'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent'

/** Nest a different domain inside a tool, e.g. a code pane inside a Paper tool. */
export function Region({ domain, className, children }: { domain: Domain; className?: string; children: React.ReactNode }) {
  return <div data-domain={domain} className={className}>{children}</div>
}

/** Label + control + hint/error. Wires the label to the control via id. */
export function Field({ label, hint, error, id, className, children }: {
  label: string
  hint?: string
  error?: string
  id: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-d-ink">{label}</label>
      {children}
      {error
        ? <p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>
        : hint && <p className="text-xs text-d-muted">{hint}</p>}
    </div>
  )
}

const control = cn(
  'w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink placeholder:text-d-muted/70',
  'transition-colors hover:border-d-muted focus-visible:border-d-accent focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-d-accent',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

export const TextInput = ({ className, mono, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) => (
  <input {...p} className={cn(control, mono && 'font-mono', className)} />
)
export const TextArea = ({ className, mono, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }) => (
  <textarea {...p} className={cn(control, 'resize-y leading-relaxed', mono && 'font-mono text-[13px]', className)} />
)
export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cn(control, 'cursor-pointer', className)} />
)

/** Buttons: primary = the one main action, secondary = outline, quiet = text-only. */
export function Btn({ variant = 'secondary', size = 'md', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-d font-medium transition-[background-color,filter,transform] active:translate-y-px',
        focus, 'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-11 px-6 text-base',
        variant === 'primary' && 'bg-d-accent text-d-accent-ink hover:brightness-110',
        variant === 'secondary' && 'border border-d-border bg-d-raised text-d-ink hover:bg-d-border/40',
        variant === 'quiet' && 'text-d-muted hover:bg-d-border/40 hover:text-d-ink',
        variant === 'danger' && 'border border-red-600/40 text-red-700 hover:bg-red-600/10 dark:text-red-300',
        className,
      )}
    />
  )
}

/** Square icon-only button. aria-label is required. */
export function IconBtn({ label, className, children, ...p }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string }) {
  return (
    <button
      {...p}
      aria-label={label}
      title={label}
      className={cn('inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-d text-d-ink transition-colors hover:bg-d-border/50', focus, 'disabled:cursor-not-allowed disabled:opacity-40', className)}
    >
      {children}
    </button>
  )
}

/** Copy to clipboard with visible confirmation. */
export function CopyBtn({ value, label = 'Copy', size = 'sm', className }: { value: string; label?: string; size?: 'sm' | 'md'; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Btn
      size={size}
      disabled={!value}
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      <span aria-live="polite">{done ? 'Copied' : label}</span>
    </Btn>
  )
}

/** Exclusive choice as a segmented control. */
export function Seg<T extends string>({ value, onChange, options, label, className }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex overflow-hidden rounded-d border border-d-border bg-d-raised', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 cursor-pointer px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-d-accent',
            value === o.value ? 'bg-d-ink text-d-surface' : 'text-d-muted hover:bg-d-border/40',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** On/off switch. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors', focus, checked ? 'bg-d-accent' : 'bg-d-border')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-d-raised shadow transition-[left]', checked ? 'left-[1.125rem]' : 'left-0.5')} />
      </button>
      <span>{label}</span>
    </label>
  )
}

/** Titled group of controls. */
export function Section({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}

/** A single headline figure. Use mono for hashes/ids, display for money and counts. */
export function Stat({ label, value, note, tone = 'display', className }: { label: string; value: React.ReactNode; note?: string; tone?: 'display' | 'serif' | 'mono'; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs text-d-muted">{label}</p>
      <p className={cn('truncate text-2xl font-semibold tabular-nums', tone === 'serif' ? 'font-serif' : tone === 'mono' ? 'font-mono text-lg' : 'font-display')}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-d-muted">{note}</p>}
    </div>
  )
}

/** Key/value row for result lists. */
export function Row({ label, value, copy, mono }: { label: string; value: string; copy?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-d-border/70 py-2 last:border-b-0">
      <dt className="w-32 shrink-0 text-sm text-d-muted">{label}</dt>
      <dd className={cn('min-w-0 flex-1 break-all text-sm', mono && 'font-mono text-[13px]')}>{value || <span className="text-d-muted">-</span>}</dd>
      {copy && <CopyBtn value={value} />}
    </div>
  )
}

/** Inline message. tone: error | ok | info. */
export function Notice({ tone = 'info', children, className }: { tone?: 'error' | 'ok' | 'info'; children: React.ReactNode; className?: string }) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'ok' ? CheckCircle2 : Info
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-d border px-3 py-2 text-sm',
        tone === 'error' && 'border-red-600/30 bg-red-600/10 text-red-800 dark:text-red-200',
        tone === 'ok' && 'border-emerald-600/30 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200',
        tone === 'info' && 'border-d-border bg-d-surface text-d-muted',
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}

/** Empty state: say why it is empty and what fills it. */
export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      {children && <p className="max-w-sm text-sm text-d-muted">{children}</p>}
      {action}
    </div>
  )
}

/** Small toggle chip, e.g. regex flags. */
export function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={cn('h-7 cursor-pointer rounded-d border px-2.5 font-mono text-xs transition-colors', focus, on ? 'border-d-accent bg-d-accent text-d-accent-ink' : 'border-d-border text-d-muted hover:bg-d-border/40')}
    >
      {children}
    </button>
  )
}

/** Page-level column for Paper/Instrument-style tools inside a scrolling shell. */
export function Column({ children, className, width = 'md' }: { children: React.ReactNode; className?: string; width?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const w = { sm: 'max-w-sm', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[width]
  return <div className={cn('mx-auto flex w-full flex-col gap-6', w, className)}>{children}</div>
}

/**
 * Scrolling page body for tools that are not full-height. The shell adds no padding,
 * so every tool owns its own: use <Scroll> (padded, scrolls) or fill the height yourself (h-full).
 */
export function Scroll({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('h-full overflow-auto p-5 sm:p-6', className)}>{children}</div>
}

export * from './Workbench'
export * from './Paper'
export * from './Studio'
export * from './Stage'
export * from './Instrument'
