import { cn } from '@/lib/utils'

/** A single device body, centered. */
export function Instrument({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex h-full items-start justify-center overflow-auto p-4 sm:items-center sm:p-8">
      <div className={cn(
        'w-full max-w-sm rounded-d border border-d-border bg-d-raised p-6',
        'shadow-[0_2px_0_hsl(var(--d-border)),0_24px_48px_-24px_hsl(var(--d-ink)/0.35)]',
        className,
      )}>
        {children}
      </div>
    </div>
  )
}

/** Readout: big tabular figures. */
export function Readout({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-[calc(var(--d-radius)-4px)] bg-d-surface px-4 py-5 text-center shadow-[inset_0_2px_6px_hsl(var(--d-ink)/0.12)]" role="timer" aria-label={label}>
      <span className="font-display text-7xl font-semibold tabular-nums leading-none">{children}</span>
    </div>
  )
}

/** Chunky device key. */
export function Key({ accent, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { accent?: boolean }) {
  return (
    <button
      {...p}
      className={cn(
        'min-h-12 cursor-pointer rounded-[calc(var(--d-radius)-4px)] border px-4 text-sm font-semibold transition-transform active:translate-y-px',
        'shadow-[0_2px_0_hsl(var(--d-border))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent disabled:cursor-not-allowed disabled:opacity-40',
        accent ? 'border-d-accent bg-d-accent text-d-accent-ink' : 'border-d-border bg-d-surface text-d-ink hover:bg-d-border/40',
        className,
      )}
    />
  )
}
export * from './kit'
