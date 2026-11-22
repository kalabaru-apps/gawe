import { cn } from '@/lib/utils'

/** Canvas owns the area; chrome floats above it. */
export function Stage({ children }: { children: React.ReactNode }) {
  return <div className="relative h-full min-h-0 overflow-hidden bg-d-surface">{children}</div>
}

export function FloatingPanel({ className, children, label }: { className?: string; children: React.ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className={cn('absolute z-10 rounded-d border border-d-border bg-d-raised/95 shadow-lg backdrop-blur-sm', className)}
    >
      {children}
    </section>
  )
}
export * from './kit'
